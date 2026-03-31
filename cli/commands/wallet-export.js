import * as ows from "../lib/ows.js";
import { print, printError } from "../lib/output.js";
import { getConfigValue } from "../lib/config.js";
import { readSecret } from "../lib/stdin.js";

export default async function walletExport(args, flags) {
  const walletName = flags.wallet || args[0] || getConfigValue("defaultWallet");

  if (!walletName) {
    printError("no_wallet", "No wallet specified", {
      suggestion: "Use --wallet <name> or set default: zerion config set defaultWallet <name>",
    });
    process.exit(1);
  }

  // Security: require --yes or interactive confirmation
  if (!flags.yes) {
    process.stderr.write(
      "\n⚠️  WARNING: This will display your recovery phrase.\n" +
      "   Anyone with this phrase can control all funds in this wallet.\n" +
      "   Never share it. Never paste it into a website.\n\n"
    );

    if (process.stdin.isTTY) {
      const confirm = await readSecret("Type YES to confirm: ");
      if (confirm.trim().toUpperCase() !== "YES") {
        process.stderr.write("Export cancelled.\n");
        process.exit(0);
      }
    } else {
      printError("confirmation_required", "Use --yes to confirm seed phrase export in non-interactive mode.");
      process.exit(1);
    }
  }

  try {
    const mnemonic = ows.exportWallet(walletName, flags.passphrase);
    const wallet = ows.getWallet(walletName);

    // Output to stderr, not stdout, to prevent accidental piping/capture
    process.stderr.write(JSON.stringify({
      wallet: {
        name: wallet.name,
        evmAddress: wallet.evmAddress,
      },
      mnemonic,
    }, null, 2) + "\n");
  } catch (err) {
    printError("ows_error", `Failed to export wallet: ${err.message}`, {
      suggestion: "Check wallet name with: zerion wallet list",
    });
    process.exit(1);
  }
}
