import { LABEL_ELOAD_WALLET } from "@/lib";

const Elooadwalletscreen = (props: {
  walletBalance: number;
  setWalletBalance: (balance: number) => void;
}) => {
  const { walletBalance, setWalletBalance } = props;
  return (
    <div
      style={{
        background: "rgba(76,141,255,.10)",
        border: "0.5px solid rgba(76,141,255,.24)",
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
      }}
    >
      <p style={{ color: "var(--tpl-a4)", fontSize: 11.5, margin: 0 }}>
        {LABEL_ELOAD_WALLET}
      </p>
      <input
        aria-label={LABEL_ELOAD_WALLET}
        type="number"
        value={walletBalance}
        onChange={(e) => setWalletBalance(Number(e.target.value) || 0)}
        style={{
          background: "none",
          border: "none",
          color: "var(--tpl-t2)",
          fontSize: 15,
          fontWeight: 500,
          width: "100%",
          padding: 0,
          marginTop: 2,
        }}
      />
    </div>
  );
};
export default Elooadwalletscreen;
