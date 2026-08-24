# Security Policy and Architecture Guide — NADI

This document outlines the security architecture, hardening practices, and operational guidelines for running NADI (Network Activity & Data Insight) in enterprise and office environments.

---

## 1. Security Architecture Principles

### 1.1 Local-Only Operation
- NADI is strictly designed to operate within a private Local Area Network (LAN) or a dedicated IT Management VLAN.
- The dashboard service (port 3100) must never be directly exposed to the public internet, forwarded via public NAT, or routed through public reverse proxies without a corporate VPN.
- No outbound telemetry, analytics, or external API calls are made by the application runtime.

### 1.2 Principle of Least Privilege (Mikrotik RouterOS)
- The application connects to Mikrotik RouterOS API (port 8728 / 8729) to inspect queues, active users, firewall connections, and log entries.
- Always create a dedicated, unprivileged service account for NADI. Never use the root `admin` account in production.
- The monitoring account must be restricted to `read` and `api` policies only.

Recommended RouterOS User Group Policy:
```routeros
/user group add name=nadi_readonly policy=read,api,!local,!telnet,!ssh,!ftp,!reboot,!write,!policy,!test,!winbox,!password,!web,!sniff,!sensitive,!romon,!rest-api
/user add name=nadi_monitor group=nadi_readonly password="YourStrongPasswordHere" comment="NADI Least-Privilege Monitoring Account"
```

### 1.3 Secret Management & Container Isolation
- Router credentials (`MIKROTIK_USER`, `MIKROTIK_PASSWORD`) must be supplied exclusively through environment variables via `.env`.
- Secrets are mounted to the container runtime and are never baked into the Docker image or committed into version control repositories.
- The repository `.gitignore` ensures that `.env`, `.env.*.local`, and SQLite database files (`data/*.db`) are never committed.

### 1.4 Database Security & Data Integrity
- NADI uses an embedded SQLite database running with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and `PRAGMA synchronous = NORMAL`.
- Because SQLite runs in-process, there is no exposed database network port or remote database authentication surface.
- File system permissions for the `./data` directory should be restricted to the container runtime owner (`chmod 700 ./data`).
- An automated 3-tier retention mechanism actively purges raw data older than 48 hours to prevent unbounded disk growth and limit data exposure risks.

---

## 2. Network Perimeter Hardening Guidelines

To ensure accurate bandwidth tracking and prevent unauthorized network bypass:

1. Disable ISP Modem/ONT Wireless:
   Disable built-in Wi-Fi on the ISP modem/ONT (e.g. Biznet ONT) to prevent users from connecting directly to the modem, which would bypass Mikrotik routing, hotspot captive portals, and simple queues.

2. Enforce Physical and Logical Topology:
   Connect only a single physical Ethernet cable between the ISP modem LAN port and Mikrotik WAN (Ether1). All switches, office distribution patch panels, and WiFi mesh access points must connect downstream of the Mikrotik router.

3. Restrict Mikrotik API Access by IP:
   In Mikrotik RouterOS, restrict access to the API service (`/ip service`) so that only the IP address of the monitoring server (HPE ProLiant) is allowed to connect to port 8728:
   ```routeros
   /ip service set api address=192.168.41.0/24 disabled=no
   ```

---

## 3. Reporting Security Vulnerabilities

If you identify a security vulnerability, weakness, or misconfiguration in NADI:

1. Do not publish or disclose the issue publicly.
2. Contact the internal IT department or system administrator directly.
3. Provide a detailed summary, steps to reproduce, and impacted components.
4. Security patches will be tested and deployed through standard on-premises Docker updates.
