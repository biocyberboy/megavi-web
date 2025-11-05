import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { PricePage } from '../pages/PricePage';
import { BlogPage } from '../pages/BlogPage';
import { BlogPostPage } from '../pages/BlogPostPage';
import { AdminPage } from '../pages/AdminPage';

type PageFixtures = {
  homePage: HomePage;
  pricePage: PricePage;
  blogPage: BlogPage;
  blogPostPage: BlogPostPage;
  adminPage: AdminPage;
};

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  pricePage: async ({ page }, use) => {
    await use(new PricePage(page));
  },
  blogPage: async ({ page }, use) => {
    await use(new BlogPage(page));
  },
  blogPostPage: async ({ page }, use) => {
    await use(new BlogPostPage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
});

export { expect } from '@playwright/test';
