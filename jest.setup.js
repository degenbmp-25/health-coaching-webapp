// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom"

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock the env module to avoid ESM issues with @t3-oss/env-nextjs
jest.mock("@/env.mjs", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_mock",
    DATABASE_URL: "postgresql://mock",
    CLERK_SECRET_KEY: "sk_test_mock",
    CLOUDINARY_CLOUD_NAME: "mock",
    CLOUDINARY_API_KEY: "mock",
    CLOUDINARY_API_SECRET: "mock",
    RESEND_API_KEY: "re_mock",
  },
}))
