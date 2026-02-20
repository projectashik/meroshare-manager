# @cbashik/meroshare

A command-line tool to view your portfolio and apply for IPOs across multiple Meroshare accounts.

## Features

- **Portfolio Viewer** — See share holdings across all your accounts in one table
- **IPO Apply** — Apply for open issues from all accounts with a single command
  - Checks each account's apply status before proceeding
  - Lets you select individual accounts or apply to all unapplied at once
  - Fetches bank details automatically from the API
- **Account Management** — Add, remove, update accounts interactively
- **Secure Storage** — Credentials stored in macOS Keychain (falls back to config.json on other platforms)

Zero runtime dependencies. Uses system `curl` under the hood to communicate with the Meroshare API.

## Getting Started

```bash
# 1. Check dependencies and create config
npx @cbashik/meroshare@latest init

# 2. Add your accounts
npx @cbashik/meroshare@latest configure

# 3. View portfolio
npx @cbashik/meroshare@latest portfolio

# 4. Apply for an IPO
npx @cbashik/meroshare@latest apply
```

## Commands

```bash
npx @cbashik/meroshare@latest init           # Check curl, Node.js, set up storage
npx @cbashik/meroshare@latest configure      # Add accounts interactively
npx @cbashik/meroshare@latest accounts       # List, add, remove, or update accounts
npx @cbashik/meroshare@latest portfolio      # Show portfolio (default)
npx @cbashik/meroshare@latest apply          # Apply for an open IPO
npx @cbashik/meroshare@latest migrate        # Migrate config.json → macOS Keychain
npx @cbashik/meroshare@latest help           # Show help
npx @cbashik/meroshare@latest version        # Show version
```

Running without a command defaults to `portfolio`:

```bash
npx @cbashik/meroshare@latest
```

## Storage

On **macOS**, credentials are stored securely in the system Keychain. No plain-text config file is needed. Run `migrate` to move existing accounts from config.json to Keychain:

```bash
npx @cbashik/meroshare@latest migrate
```

On **Linux** and **Windows**, config is stored at `~/.config/meroshare/config.json` or `%APPDATA%\meroshare\config.json`.

You can set up accounts interactively with `configure`, or on non-macOS systems edit the file directly:

```json
{
  "accounts": [
    {
      "dpCode": "11000",
      "username": "02376518",
      "password": "your_password",
      "crn": "S01707232100",
      "transactionPin": "1234"
    }
  ]
}
```

| Field            | Description                             | Required For     |
| ---------------- | --------------------------------------- | ---------------- |
| `dpCode`         | Depository Participant code             | All commands     |
| `username`       | BOID number                             | All commands     |
| `password`       | Meroshare login password                | All commands     |
| `crn`            | CRN number                              | `apply`          |
| `transactionPin` | 4-digit transaction PIN                 | `apply`          |

## Apply Flow

When you run `apply`:

1. Lists all currently open issues
2. You select an issue to see its details (kitta limits, share value, manager)
3. Logs into all accounts and checks which have already applied
4. Displays account list with Applied / Not Applied status
5. You choose to apply to all unapplied accounts or pick a specific one
6. Enter the number of kitta
7. Confirm, then it applies one by one and shows a summary

## License

MIT
