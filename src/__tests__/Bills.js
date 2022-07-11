/**
 * @jest-environment jsdom
 */

import { screen, waitFor, prettyDOM } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import Bills from "../containers/Bills.js";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import store from "../__mocks__/store";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon).toBeTruthy();
      expect(windowIcon.classList).toContain("active-icon");
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByTestId(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/
        )
        .map((a) => a.getAttribute("data-testid"));
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    test("Then all open bill icons should display modal when you click on it", () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      const currentBills = new Bills({
        document,
        onNavigate,
        store,
        localStorageMock,
      });

      $.fn.modal = jest.fn();
      const spyModal = jest.spyOn($.fn, "modal");

      const eyeIcons = screen.getAllByTestId("icon-eye");
      eyeIcons.map((eyeIcon) => {
        userEvent.click(eyeIcon);
      });
      expect(spyModal).toHaveBeenCalledTimes(4);
    });
    test("Then adding a new bill should load newbills page", () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const currentBills = new Bills({
        document,
        onNavigate,
        store,
        localStorageMock,
      });

      const handleClickNewBill = jest.fn((e) =>
        currentBills.handleClickNewBill(e)
      );
      const newBills = screen.getByTestId("btn-new-bill");
      newBills.addEventListener("click", handleClickNewBill);
      userEvent.click(newBills);

      const formNewBill = screen.getByTestId("form-new-bill");
      expect(formNewBill).toBeTruthy();
    });
  });
});

// test d'intégration GET Bills
describe("Given I am a user connected as an employee", () => {
  describe("When I navigate to Dashboard", () => {
    test("Fetches bills from mock API GET", async () => {
      const getSpy = jest.spyOn(store, "bills");
      const bills = await store.bills().list();
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(bills.length).toBe(4);
    });

    test("fetches bills from an API and fails with 404 message error", async () => {
      store.bills.mockImplementationOnce(() =>
        Promise.reject(new Error("Erreur 404"))
      );
      const html = BillsUI({ error: "Erreur 404" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });
    test("fetches messages from an API and fails with 500 message error", async () => {
      store.bills.mockImplementationOnce(() =>
        Promise.reject(new Error("Erreur 500"))
      );
      const html = BillsUI({ error: "Erreur 500" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
