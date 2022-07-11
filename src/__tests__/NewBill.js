/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

const setup = async () => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  localStorage.setItem(
    "user",
    JSON.stringify({ type: "Employee", email: "a@a" })
  );
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();
  return root;
};

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then new bill form should be visible", async () => {
      await setup();
      window.onNavigate(ROUTES_PATH.NewBill);

      const pageTitle = screen.getByText("Envoyer une note de frais");
      expect(pageTitle).toBeTruthy();

      const formEl = screen.getByTestId("form-new-bill");
      expect(formEl).toBeTruthy();

      const elements = {
        type: screen.getByTestId("expense-type"),
        name: screen.getByTestId("expense-name"),
        date: screen.getByTestId("datepicker"),
        amount: screen.getByTestId("amount"),
        vat: screen.getByTestId("vat"),
        pct: screen.getByTestId("pct"),
        commentary: screen.getByTestId("commentary"),
        file: screen.getByTestId("file"),
      };
      Object.keys(elements).forEach((key) =>
        expect(elements[key]).toBeTruthy()
      );
    });

    // File upload
    describe("And I choose an image file", () => {
      describe("If image extension is allowed", () => {
        test("Then store.bills().create() should be called", async () => {
          await setup();
          window.onNavigate(ROUTES_PATH.NewBill);

          // Spy
          const bills = mockStore.bills();
          const newBill = jest.spyOn(bills, "create");

          // Elements
          const fileInputEl = screen.getByTestId("file");

          const now = new Date();
          const file = new File([], "test.png", {
            type: "image/png",
            lastModified: now.getTime(),
          });

          // Choose a file
          fireEvent["change"](fileInputEl, {
            target: {
              ...fileInputEl,
              files: [file],
            },
          });
          await waitFor(() => process.nextTick);

          // Assertions
          expect(bills.create).not.toBeCalled();
          expect(window.location.hash).toBe(ROUTES_PATH.NewBill);

          jest.restoreAllMocks();
        });

        describe("If api throws an error", () => {
          test("Then console.error should be called", async () => {
            await setup();
            window.onNavigate(ROUTES_PATH.NewBill);

            const bills = mockStore.bills();
            jest.spyOn(global.console, "error");
            jest.spyOn(bills, "create").mockImplementation(() => {
              return Promise.reject(/Erreur 404/);
            });

            // Helpers
            // Elements
            const fileInputEl = screen.getByTestId("file");

            const now = new Date();
            const file = new File([], "Test.png", {
              type: "image/png",
              lastModified: now.getTime(),
            });

            // Choose a file
            fireEvent["change"](fileInputEl, {
              target: {
                ...fileInputEl,
                files: [file],
              },
            });
            await waitFor(() => process.nextTick);

            // Should have called store.bills().create AND NOT being redirected to Bills page
            expect(bills.create).not.toBeCalled();

            jest.restoreAllMocks();
          });
        });
      });
      describe("If image extension is NOT allowed", () => {
        test("Then store.bills().create() should NOT be called", async () => {
          await setup();
          window.onNavigate(ROUTES_PATH.NewBill);

          // Spy
          const bills = mockStore.bills();
          jest.spyOn(bills, "create");

          // Elements
          const fileInputEl = screen.getByTestId("file");

          const now = new Date();
          const file = new File([], "Test.gif", {
            type: "image/gif",
            lastModified: now.getTime(),
          });

          // Choose a file
          fireEvent["change"](fileInputEl, {
            target: {
              ...fileInputEl,
              files: [file],
            },
          });
          await waitFor(() => process.nextTick);

          // Assertions
          expect(bills.create).not.toBeCalled();
          expect(window.location.hash).toBe(ROUTES_PATH.NewBill);

          jest.restoreAllMocks();
        });
      });
    });
    describe("And I choose a non-image file", () => {
      test("Then store.bills().create() should NOT be called", async () => {
        await setup();
        window.onNavigate(ROUTES_PATH.NewBill);

        // Spy
        const bills = mockStore.bills();
        jest.spyOn(bills, "create");

        // Elements
        const fileInputEl = screen.getByTestId("file");

        const now = new Date();
        const file = new File([], "Test.pdf", {
          type: "application/pdf",
          lastModified: now.getTime(),
        });

        // Choose a file
        fireEvent["change"](fileInputEl, {
          target: {
            ...fileInputEl,
            files: [file],
          },
        });
        await waitFor(() => process.nextTick);

        // Assertions
        expect(bills.create).not.toBeCalled();
        expect(window.location.hash).toBe(ROUTES_PATH.NewBill);

        jest.restoreAllMocks();
      });
    });

    // Form validation
    describe("And I DON'T fill required form fields", () => {
      test("Then submit will do nothing", async () => {
        await setup();
        window.onNavigate(ROUTES_PATH.NewBill);

        // Submit form
        const formEl = screen.getByTestId("form-new-bill");
        fireEvent["submit"](formEl);

        // Should NOT be redirected
        expect(window.location.hash).toBe(ROUTES_PATH.NewBill);
      });
    });
    describe("And I DO fill required form fields", () => {
      test("Then I should get redirected to Bills page when I submit form", async () => {
        await setup();
        window.onNavigate(ROUTES_PATH.NewBill);

        // Helpers
        const formEl = screen.getByTestId("form-new-bill");
        const elems = {
          type: screen.getByTestId("expense-type"),
          name: screen.getByTestId("expense-name"),
          date: screen.getByTestId("datepicker"),
          amount: screen.getByTestId("amount"),
          vat: screen.getByTestId("vat"),
          pct: screen.getByTestId("pct"),
          commentary: screen.getByTestId("commentary"),
          fileUrl: screen.getByTestId("file"),
          fileName: screen.getByTestId("file"),
        };
        const now = new Date();
        const day = ("0" + now.getDate()).slice(-2);
        const month = ("0" + (now.getMonth() + 1)).slice(-2);
        const today = now.getFullYear() + "-" + month + "-" + day;

        // Fill form inputs
        elems.name.value = "Test";
        elems.date.value = today;
        elems.amount.value = 10;
        elems.commentary.value = "Commentaire de test";
        elems.vat.value = 70;
        elems.pct.value = 20;

        // Submit form
        fireEvent["submit"](formEl);

        // Should BE redirected
        await waitFor(() => process.nextTick);
        expect(window.location.hash).toBe(ROUTES_PATH.Bills);
      });
    });
  });
});

// test d'intégration POST
describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    describe("And I DO fill required form fields", () => {
      describe("If API throws an error", () => {
        test("Then submit should NOT redirect on Bills page", async () => {
          await setup();
          window.onNavigate(ROUTES_PATH.NewBill);

          const bills = mockStore.bills();
          jest.spyOn(bills, "update").mockImplementation((bill) => {
            return Promise.reject(/Erreur 404/);
          });

          // Helpers
          const formEl = screen.getByTestId("form-new-bill");
          const elems = {
            type: screen.getByTestId("expense-type"),
            name: screen.getByTestId("expense-name"),
            date: screen.getByTestId("datepicker"),
            amount: screen.getByTestId("amount"),
            vat: screen.getByTestId("vat"),
            pct: screen.getByTestId("pct"),
            commentary: screen.getByTestId("commentary"),
            fileUrl: screen.getByTestId("file"),
            fileName: screen.getByTestId("file"),
          };
          const now = new Date();
          const day = ("0" + now.getDate()).slice(-2);
          const month = ("0" + (now.getMonth() + 1)).slice(-2);
          const today = now.getFullYear() + "-" + month + "-" + day;

          // Fill form inputs
          elems.name.value = "Test";
          elems.date.value = today;
          elems.amount.value = 10;
          elems.commentary.value = "Commentaire de test";
          elems.vat.value = 70;
          elems.pct.value = 20;

          // Submit form
          fireEvent["submit"](formEl);
          await waitFor(() => process.nextTick);

          // Should have called store.bills().update AND NOT being redirected to Bills page
          expect(bills.update).toBeCalled();
          expect(window.location.hash).not.toBe(ROUTES_PATH.Bills);

          jest.restoreAllMocks();
        });
      });
    });
  });
});
