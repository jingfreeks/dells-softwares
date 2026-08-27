import { fireEvent, render, screen } from "@testing-library/react-native";
import { TodaysSalesScreen } from "../todayssalesscreen";
import { useStoreData } from "../../lib/storeData";
import type { SaleRecord } from "../../lib/types";

jest.mock("../../lib/storeData", () => ({ useStoreData: jest.fn() }));

const mockedUseStoreData = useStoreData as jest.Mock;

const sale: SaleRecord = {
  id: "s1",
  timestamp: new Date().toISOString(),
  total: 60,
  cashierName: "Maricel",
  paymentType: "cash",
  customerId: null,
  referenceNo: null,
  status: "completed",
  items: [{ productId: "p1", name: "Rice", quantity: 1, price: 60, itemType: "product", fee: 0, lineTotal: 60 }],
};

describe("TodaysSalesScreen", () => {
  beforeEach(() => {
    mockedUseStoreData.mockReturnValue({ sales: [sale], loading: false });
  });

  it("shows a link to Insights when onOpenInsights is provided, and calls it", () => {
    const onOpenInsights = jest.fn();
    render(<TodaysSalesScreen storeName="Dell's Store" onOpenInsights={onOpenInsights} />);

    fireEvent.press(screen.getByText("See best sellers & category breakdown"));
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
  });

  it("omits the Insights link when onOpenInsights isn't provided", () => {
    render(<TodaysSalesScreen storeName="Dell's Store" />);
    expect(screen.queryByText("See best sellers & category breakdown")).toBeNull();
  });
});
