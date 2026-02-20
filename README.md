# @cbashik/meroshare

A command-line tool to view your portfolio and apply for IPOs across multiple Meroshare accounts.

## Features

- **Portfolio Viewer** — See share holdings across all your accounts in one table
- **IPO Apply** — Apply for open issues from all accounts with a single command
  - Checks each account's apply status before proceeding
  - Lets you select individual accounts or apply to all unapplied at once
  - Fetches bank details automatically from the API
- **Account Management** — Add, remove, update accounts interactively

Zero runtime dependencies. Uses system `curl` under the hood to communicate with the Meroshare API.

## Prerequisites

- **Node.js** v18+
- **curl** (pre-installed on macOS and most Linux distros)

## Install

```bash
git clone <repo-url> && cd meroshare-cli-ts
pnpm install && pnpm build

# Link globally
pnpm link --global
```

After linking, the `meroshare` command is available system-wide.

## Quick Start

```bash
# First-time setup — interactively add your accounts
meroshare configure

# View portfolio
meroshare

# Apply for an IPO
meroshare apply

# Manage accounts
meroshare accounts
```

## Commands

| Command     | Description                                 |
| ----------- | ------------------------------------------- |
| `portfolio` | Show portfolio for all accounts *(default)* |
| `apply`     | Apply for an open IPO across accounts       |
| `accounts`  | List, add, remove, or update accounts       |
| `configure` | Interactive first-time setup                |
| `help`      | Show help message                           |
| `version`   | Show version                                |

## Configuration

Config is stored at `~/.config/meroshare/config.json` on macOS and Linux, or `%APPDATA%\meroshare\config.json` on Windows. A `config.json` in the current directory is also picked up as a fallback.

You can set up accounts interactively with `meroshare configure`, or edit the file directly:

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

When you run `meroshare apply`:

1. Lists all currently open issues
2. You select an issue to see its details (kitta limits, share value, manager)
3. Logs into all accounts and checks which have already applied
4. Displays account list with Applied / Not Applied status
5. You choose to apply to all unapplied accounts or pick a specific one
6. Enter the number of kitta
7. Confirm, then it applies one by one and shows a summary

## Development

```bash
pnpm build          # compile TypeScript
pnpm start          # run compiled CLI
pnpm start apply    # run apply command
```

## License

MIT
