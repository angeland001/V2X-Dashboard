/**
 * Telnet client for traffic controllers that expose a Telnet CLI
 * (e.g. Siemens M60).  Uses the built-in `net` module — no new packages.
 *
 * Usage:
 *   const c = new TelnetClient('192.168.1.10', 23, { timeout: 8000 });
 *   await c.connect();
 *   await c.login('admin', 'secret');
 *   const out = await c.sendCommand('show status');
 *   await c.close();
 *
 * Each API call should open and close its own TelnetClient so that
 * concurrent requests never share a session.
 */

"use strict";

const net = require("net");

// Telnet IAC (Interpret As Command) byte and verb codes
const IAC  = 0xff;
const WILL = 0xfb;
const WONT = 0xfc;
const DO   = 0xfd;
const DONT = 0xfe;

class TelnetAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "TelnetAuthError";
  }
}

class TelnetClient {
  /**
   * @param {string} host
   * @param {number} [port=23]
   * @param {object} [opts]
   * @param {number} [opts.timeout=10000]        TCP connect + readUntil timeout (ms)
   * @param {number} [opts.loginTimeout=6000]    Extra timeout for login sequence
   * @param {RegExp} [opts.promptPattern]        Shell prompt pattern
   */
  constructor(host, port = 23, opts = {}) {
    this._host          = host;
    this._port          = port;
    this._timeout       = opts.timeout      ?? 10000;
    this._loginTimeout  = opts.loginTimeout ?? 6000;
    this._promptPattern = opts.promptPattern ?? /[$#>%]\s*$/m;

    this._sock    = null;
    this._buf     = "";           // accumulated decoded text
    this._closed  = false;

    // IAC FSM state: "idle" | "iac" | "verb"
    this._iacState = "idle";
    this._iacVerb  = null;

    // Listeners waiting for readUntil to resolve
    this._dataListeners = [];
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Establish TCP connection.  Resolves once the socket is open.
   * The caller must then invoke login() before sending commands.
   */
  connect() {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(this._port, this._host);
      this._sock = sock;

      const onConnect = () => {
        sock.removeListener("error",   onError);
        sock.removeListener("close",   onClose);
        resolve();
      };
      const onError = (err) => {
        sock.destroy();
        reject(new Error(`Telnet connect failed: ${err.message}`));
      };
      const onClose = () => {
        reject(new Error("Telnet socket closed before connection established"));
      };

      sock.setTimeout(this._timeout);
      sock.on("timeout", () => {
        sock.destroy();
        reject(new Error("Telnet connect timed out"));
      });
      sock.once("connect", onConnect);
      sock.once("error",   onError);
      sock.once("close",   onClose);

      sock.on("data", (chunk) => this._onData(chunk));
      sock.on("close", () => {
        this._closed = true;
        // Reject any pending readUntil waiters
        for (const { reject: rej } of this._dataListeners) {
          rej(new Error("Telnet socket closed unexpectedly"));
        }
        this._dataListeners = [];
      });
    });
  }

  /**
   * Perform the login handshake.
   * Waits for "login:" prompt → sends username → waits for "password:" → sends password
   * → waits for shell prompt.
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<string>} welcome banner text
   * @throws {TelnetAuthError} if credentials are rejected (prompt never appears)
   */
  async login(username, password) {
    try {
      await this.readUntil(/login:\s*$/i, this._loginTimeout);
      this._send(username + "\r\n");
      await this.readUntil(/password:\s*$/i, this._loginTimeout);
      this._send(password + "\r\n");
      const banner = await this.readUntil(this._promptPattern, this._loginTimeout);
      return banner;
    } catch (err) {
      if (err.message.includes("timed out")) {
        throw new TelnetAuthError(
          "Telnet authentication failed — check credentials or controller prompt pattern"
        );
      }
      throw err;
    }
  }

  /**
   * Send a command and return the output up to the next shell prompt.
   *
   * @param {string}  cmd
   * @param {RegExp}  [waitFor]      Defaults to the promptPattern
   * @param {number}  [timeoutMs]    Defaults to this._timeout
   * @returns {Promise<string>}
   */
  async sendCommand(cmd, waitFor = this._promptPattern, timeoutMs = this._timeout) {
    this._send(cmd + "\r\n");
    return this.readUntil(waitFor, timeoutMs);
  }

  /**
   * Close the socket.  Safe to call multiple times.
   */
  close() {
    if (this._sock && !this._closed) {
      this._sock.destroy();
    }
  }

  // ── readUntil ────────────────────────────────────────────────────────────────

  /**
   * Resolves with the buffered text once `pattern` matches (at end of buffer).
   * The matched text is consumed from the buffer before resolving.
   *
   * @param {RegExp} pattern
   * @param {number} timeoutMs
   * @returns {Promise<string>}
   */
  readUntil(pattern, timeoutMs = this._timeout) {
    // If the buffer already matches, resolve immediately
    if (pattern.test(this._buf)) {
      const result = this._buf;
      this._buf = "";
      return Promise.resolve(result);
    }

    return new Promise((resolve, reject) => {
      let timer = null;

      const cleanup = () => {
        clearTimeout(timer);
        this._dataListeners = this._dataListeners.filter((l) => l !== listener);
      };

      const listener = {
        pattern,
        resolve: (text) => { cleanup(); resolve(text); },
        reject:  (err)  => { cleanup(); reject(err);   },
      };

      this._dataListeners.push(listener);

      timer = setTimeout(() => {
        listener.reject(new Error(`readUntil timed out waiting for ${pattern}`));
      }, timeoutMs);
    });
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  _send(text) {
    if (!this._sock || this._closed) return;
    this._sock.write(text, "utf8");
  }

  /**
   * Called on every TCP data event.  Strips Telnet IAC negotiation sequences
   * and appends clean text to this._buf.  Notifies any pending readUntil listeners.
   */
  _onData(chunk) {
    const bytes = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
    let text = "";

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];

      if (this._iacState === "iac") {
        // Second byte after IAC: the verb
        if (b === WILL || b === WONT || b === DO || b === DONT) {
          this._iacState = "verb";
          this._iacVerb  = b;
        } else if (b === IAC) {
          // Escaped 0xFF literal in data
          text += "\xff";
          this._iacState = "idle";
        } else {
          // Single-byte IAC command (SE, NOP, DM, etc.) — ignore
          this._iacState = "idle";
        }
        continue;
      }

      if (this._iacState === "verb") {
        // Third byte: the option.  Respond to decline all options.
        if (this._iacVerb === WILL || this._iacVerb === DO) {
          const response = this._iacVerb === WILL ? DONT : WONT;
          this._sock.write(Buffer.from([IAC, response, b]));
        }
        this._iacState = "idle";
        this._iacVerb  = null;
        continue;
      }

      // Normal idle state
      if (b === IAC) {
        this._iacState = "iac";
        continue;
      }

      text += String.fromCharCode(b);
    }

    if (text) {
      this._buf += text;
      this._notifyListeners();
    }
  }

  _notifyListeners() {
    for (const listener of [...this._dataListeners]) {
      if (listener.pattern.test(this._buf)) {
        const result = this._buf;
        this._buf = "";
        listener.resolve(result);
        // Restart loop since _dataListeners was mutated by cleanup()
        break;
      }
    }
  }
}

module.exports = { TelnetClient, TelnetAuthError };
