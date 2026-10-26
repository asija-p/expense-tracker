import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, switchMap } from 'rxjs';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  title: string;
  amount: string;
  description: string | null;
  expenseDate: string;
  category: Category;
}

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly apiUrl = 'http://localhost:3000';

  user: AuthUser | null = null;
  categories: Category[] = [];
  expenses: Expense[] = [];
  authMode: AuthMode = 'login';
  authName = '';
  authEmail = '';
  authPassword = '';
  expenseTitle = '';
  expenseAmount = '';
  expenseDate = this.today();
  expenseCategoryId: number | null = null;
  expenseDescription = '';
  categoryName = '';
  showExpenseForm = false;
  showCategoryForm = false;
  expandedYear: number | null = null;
  expandedMonth: string | null = null;
  busy = false;
  authError = '';
  pageError = '';
  pageMessage = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get<AuthUser>(`${this.apiUrl}/auth/me`, { withCredentials: true })
      .subscribe({
        next: (user) => {
          this.user = user;
          this.loadDashboard();
        },
        error: () => {
          this.user = null;
        },
      });
  }

  get authTitle(): string {
    return this.authMode === 'login' ? 'Welcome back' : 'Create your account';
  }

  get totalSpent(): number {
    return this.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  get last30DaysTotal(): number {
    return this.sumSince(30);
  }

  get lastWeekTotal(): number {
    return this.sumSince(7);
  }

  get years(): number[] {
    return [...new Set(this.expenses.map((expense) => this.yearOf(expense)))].sort(
      (a, b) => b - a,
    );
  }

  get recentExpenses(): Expense[] {
    return this.expenses.slice(0, 5);
  }

  setAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
  }

  submitAuth(): void {
    this.busy = true;
    this.authError = '';

    const login = () =>
      this.http.post<AuthUser>(
        `${this.apiUrl}/auth/login`,
        { email: this.authEmail, password: this.authPassword },
        { withCredentials: true },
      );

    const request: Observable<AuthUser> =
      this.authMode === 'register'
        ? this.http
            .post<AuthUser>(
              `${this.apiUrl}/auth/register`,
              {
                name: this.authName,
                email: this.authEmail,
                password: this.authPassword,
              },
              { withCredentials: true },
            )
            .pipe(switchMap(() => login()))
        : login();

    request.subscribe({
      next: (user) => {
        this.user = user;
        this.authPassword = '';
        this.busy = false;
        this.loadDashboard();
      },
      error: (error: { error?: { message?: string | string[] } }) => {
        const message = error.error?.message;
        this.authError = Array.isArray(message)
          ? message.join('. ')
          : (message ?? 'Could not sign in. Check the API is running and try again.');
        this.busy = false;
      },
    });
  }

  logout(): void {
    this.pageError = '';
    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.user = null;
          this.categories = [];
          this.expenses = [];
          this.pageMessage = '';
          this.authMode = 'login';
        },
        error: () => {
          this.pageError = 'Could not log out. Please try again.';
        },
      });
  }

  loadDashboard(): void {
    forkJoin({
      expenses: this.http.get<Expense[]>(`${this.apiUrl}/expenses`, {
        withCredentials: true,
      }),
      categories: this.http.get<Category[]>(`${this.apiUrl}/categories`, {
        withCredentials: true,
      }),
    }).subscribe({
      next: ({ expenses, categories }) => {
        this.expenses = expenses;
        this.categories = categories;
        this.pageError = '';
        if (this.expenseCategoryId === null && categories.length > 0) {
          this.expenseCategoryId = categories[0].id;
        }
      },
      error: () => {
        this.pageError = 'Could not load your expenses. Please refresh and try again.';
      },
    });
  }

  addExpense(): void {
    if (this.expenseCategoryId === null) {
      this.pageError = 'Create a category before adding an expense.';
      return;
    }

    this.busy = true;
    this.pageError = '';
    this.http
      .post<Expense>(
        `${this.apiUrl}/expenses`,
        {
          title: this.expenseTitle,
          amount: this.expenseAmount,
          expenseDate: this.expenseDate,
          categoryId: this.expenseCategoryId,
          description: this.expenseDescription || undefined,
        },
        { withCredentials: true },
      )
      .subscribe({
        next: () => {
          this.showExpenseForm = false;
          this.expenseTitle = '';
          this.expenseAmount = '';
          this.expenseDescription = '';
          this.expenseDate = this.today();
          this.busy = false;
          this.pageMessage = 'Expense added.';
          this.loadDashboard();
        },
        error: (error: { error?: { message?: string | string[] } }) => {
          this.pageError = this.errorMessage(error, 'Could not add this expense.');
          this.busy = false;
        },
      });
  }

  addCategory(): void {
    this.busy = true;
    this.pageError = '';
    this.http
      .post<Category>(
        `${this.apiUrl}/categories`,
        { name: this.categoryName },
        { withCredentials: true },
      )
      .subscribe({
        next: (category) => {
          this.categories = [...this.categories, category].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          this.expenseCategoryId = category.id;
          this.categoryName = '';
          this.showCategoryForm = false;
          this.busy = false;
          this.pageMessage = 'Category added.';
        },
        error: (error: { error?: { message?: string | string[] } }) => {
          this.pageError = this.errorMessage(error, 'Could not add this category.');
          this.busy = false;
        },
      });
  }

  deleteExpense(expense: Expense): void {
    if (!window.confirm(`Delete "${expense.title}"?`)) {
      return;
    }
    this.http
      .delete(`${this.apiUrl}/expenses/${expense.id}`, {
        withCredentials: true,
      })
      .subscribe({
        next: () => {
          this.pageMessage = 'Expense deleted.';
          this.loadDashboard();
        },
        error: () => {
          this.pageError = 'Could not delete this expense.';
        },
      });
  }

  deleteCategory(category: Category): void {
    if (!window.confirm(`Delete the "${category.name}" category?`)) {
      return;
    }
    this.pageError = '';
    this.http
      .delete(`${this.apiUrl}/categories/${category.id}`, {
        withCredentials: true,
      })
      .subscribe({
        next: () => {
          this.categories = this.categories.filter((item) => item.id !== category.id);
          if (this.expenseCategoryId === category.id) {
            this.expenseCategoryId = this.categories[0]?.id ?? null;
          }
          this.pageMessage = 'Category deleted.';
        },
        error: (error: { error?: { message?: string | string[] } }) => {
          this.pageError = this.errorMessage(
            error,
            'Could not delete this category. It may still be used by an expense.',
          );
        },
      });
  }

  toggleYear(year: number): void {
    this.expandedYear = this.expandedYear === year ? null : year;
    this.expandedMonth = null;
  }

  toggleMonth(key: string): void {
    this.expandedMonth = this.expandedMonth === key ? null : key;
  }

  monthsForYear(year: number): { key: string; label: string; total: number }[] {
    const monthTotals = new Map<number, number>();
    for (const expense of this.expenses) {
      if (this.yearOf(expense) === year) {
        const month = Number(expense.expenseDate.slice(5, 7));
        monthTotals.set(
          month,
          (monthTotals.get(month) ?? 0) + Number(expense.amount),
        );
      }
    }
    return [...monthTotals.entries()]
      .sort(([a], [b]) => b - a)
      .map(([month, total]) => ({
        key: `${year}-${String(month).padStart(2, '0')}`,
        label: new Intl.DateTimeFormat('en', { month: 'long' }).format(
          new Date(year, month - 1, 1),
        ),
        total,
      }));
  }

  categoriesForMonth(key: string): { name: string; total: number }[] {
    const totals = new Map<string, number>();
    for (const expense of this.expenses) {
      if (expense.expenseDate.startsWith(key)) {
        totals.set(
          expense.category.name,
          (totals.get(expense.category.name) ?? 0) + Number(expense.amount),
        );
      }
    }
    return [...totals.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }

  totalForYear(year: number): number {
    return this.expenses
      .filter((expense) => this.yearOf(expense) === year)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  private sumSince(days: number): number {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);
    const startDate = this.localDateKey(start);
    return this.expenses
      .filter((expense) => expense.expenseDate >= startDate)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  private yearOf(expense: Expense): number {
    return Number(expense.expenseDate.slice(0, 4));
  }

  private today(): string {
    return this.localDateKey(new Date());
  }

  private localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private errorMessage(
    error: { error?: { message?: string | string[] } },
    fallback: string,
  ): string {
    const message = error.error?.message;
    return Array.isArray(message) ? message.join('. ') : (message ?? fallback);
  }
}
