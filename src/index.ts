/**
 * IP address types modelled on Go's `net/netip`: {@link Addr}, {@link Prefix}
 * and {@link AddrPort}. All values are immutable; compare them with
 * `equals()` / `compare()` since `===` compares references.
 *
 * @module
 */

/** Thrown when parsing an address, prefix or addr:port string fails. */
export class ParseError extends Error {
  override name = "ParseError";
  constructor(
    /** The string that failed to parse. */
    readonly input: string,
    /** Why it failed. */
    readonly reason: string,
  ) {
    super(`parse ${JSON.stringify(input)}: ${reason}`);
  }
}

/**
 * An IPv4 or IPv6 address (with optional IPv6 zone), like Go's `netip.Addr`.
 *
 * The "zero" Addr (from {@link Addr.fromSlice} with a bad length, or
 * {@link Addr.next} on overflow) is invalid: {@link Addr.isValid} is false.
 */
export class Addr {
  /** 0 bytes (invalid), 4 (IPv4) or 16 (IPv6). Never mutated. */
  readonly #b: Uint8Array;
  readonly #zone: string;

  static readonly #invalid = new Addr(new Uint8Array(0));

  private constructor(b: Uint8Array, zone = "") {
    this.#b = b;
    this.#zone = zone;
  }

  /** Address from 4 bytes (Go `AddrFrom4`). */
  static from4(b: Uint8Array): Addr {
    if (b.length !== 4) throw new RangeError("Addr.from4: need 4 bytes");
    return new Addr(b.slice());
  }

  /** Address from 16 bytes; IPv4-mapped input stays IPv6 (Go `AddrFrom16`). */
  static from16(b: Uint8Array): Addr {
    if (b.length !== 16) throw new RangeError("Addr.from16: need 16 bytes");
    return new Addr(b.slice());
  }

  /** Address from 4 or 16 bytes; any other length gives the invalid Addr (Go `AddrFromSlice`). */
  static fromSlice(b: Uint8Array): Addr {
    return b.length === 4 || b.length === 16 ? new Addr(b.slice()) : Addr.#invalid;
  }

  /** `0.0.0.0` */
  static ipv4Unspecified(): Addr {
    return new Addr(new Uint8Array(4));
  }
  /** `::` */
  static ipv6Unspecified(): Addr {
    return new Addr(new Uint8Array(16));
  }
  /** `::1` */
  static ipv6Loopback(): Addr {
    return Addr.#v6(0, 1);
  }
  /** `ff02::1` */
  static ipv6LinkLocalAllNodes(): Addr {
    return Addr.#v6(0xff02, 1);
  }
  /** `ff02::2` */
  static ipv6LinkLocalAllRouters(): Addr {
    return Addr.#v6(0xff02, 2);
  }
  static #v6(first: number, last: number): Addr {
    const b = new Uint8Array(16);
    b[0] = first >> 8;
    b[1] = first & 0xff;
    b[15] = last;
    return new Addr(b);
  }

  /**
   * Parses `"192.0.2.1"`, `"2001:db8::1"`, `"::ffff:192.0.2.1"` or
   * `"fe80::1%eth0"` (Go `ParseAddr`). IPv4 octets with leading zeros are
   * rejected, as in Go, to avoid octal ambiguity.
   * @throws {ParseError}
   */
  static parse(s: string): Addr {
    for (const c of s) {
      if (c === ".") return new Addr(parse4(s, s));
      if (c === ":") return new Addr(...parse6(s));
      if (c === "%") throw new ParseError(s, "missing IPv6 address");
    }
    throw new ParseError(s, "unable to parse IP");
  }

  /** Inverse of {@link Addr.marshalBinary}. */
  static unmarshalBinary(b: Uint8Array): Addr {
    if (b.length === 0) return Addr.#invalid;
    if (b.length === 4 || b.length === 16) return new Addr(b.slice());
    if (b.length > 16) return new Addr(b.slice(0, 16), new TextDecoder().decode(b.subarray(16)));
    throw new RangeError(`Addr.unmarshalBinary: unexpected length ${b.length}`);
  }

  isValid(): boolean {
    return this.#b.length !== 0;
  }
  is4(): boolean {
    return this.#b.length === 4;
  }
  /** True for IPv6, including IPv4-mapped IPv6. */
  is6(): boolean {
    return this.#b.length === 16;
  }
  /** True for `::ffff:a.b.c.d`. */
  is4In6(): boolean {
    const b = this.#b;
    return b.length === 16 && b[10] === 0xff && b[11] === 0xff && b.subarray(0, 10).every((x) => x === 0);
  }
  /** 0, 32 or 128. */
  bitLen(): number {
    return this.#b.length * 8;
  }
  /** IPv6 zone, or `""`. */
  zone(): string {
    return this.#zone;
  }
  /** Same IPv6 address with `zone` (`""` removes it). No-op for IPv4. */
  withZone(zone: string): Addr {
    return this.is6() ? new Addr(this.#b, zone) : this;
  }
  /** `::ffff:a.b.c.d` → `a.b.c.d` (zone dropped); anything else unchanged. */
  unmap(): Addr {
    return this.is4In6() ? new Addr(this.#b.slice(12)) : this;
  }

  /** 4 bytes; works for IPv4 and IPv4-mapped IPv6. */
  as4(): Uint8Array {
    if (this.is4()) return this.#b.slice();
    if (this.is4In6()) return this.#b.slice(12);
    throw new TypeError(`as4 called on ${this}`);
  }
  /** 16 bytes; IPv4 is returned IPv4-mapped. */
  as16(): Uint8Array {
    const out = new Uint8Array(16);
    if (this.is4()) {
      out[10] = out[11] = 0xff;
      out.set(this.#b, 12);
    } else out.set(this.#b);
    return out;
  }
  /** 4, 16 or 0 bytes depending on family. */
  asSlice(): Uint8Array {
    return this.#b.slice();
  }

  isLoopback(): boolean {
    const b = this.unmap().#b;
    if (b.length === 4) return b[0] === 127;
    return b.length === 16 && b[15] === 1 && b.subarray(0, 15).every((x) => x === 0);
  }
  isMulticast(): boolean {
    const b = this.unmap().#b;
    if (b.length === 4) return (b[0] & 0xf0) === 0xe0;
    return b.length === 16 && b[0] === 0xff;
  }
  /** `ff01::/16`-style scope (IPv6 only). */
  isInterfaceLocalMulticast(): boolean {
    return this.is6() && this.#b[0] === 0xff && (this.#b[1] & 0x0f) === 0x01;
  }
  isLinkLocalMulticast(): boolean {
    const b = this.unmap().#b;
    if (b.length === 4) return b[0] === 224 && b[1] === 0 && b[2] === 0;
    return b.length === 16 && b[0] === 0xff && (b[1] & 0x0f) === 0x02;
  }
  isLinkLocalUnicast(): boolean {
    const b = this.unmap().#b;
    if (b.length === 4) return b[0] === 169 && b[1] === 254;
    return b.length === 16 && b[0] === 0xfe && (b[1] & 0xc0) === 0x80;
  }
  /** RFC 1918 (IPv4) or RFC 4193 `fc00::/7` (IPv6). */
  isPrivate(): boolean {
    const b = this.unmap().#b;
    if (b.length === 4) {
      return b[0] === 10 || (b[0] === 172 && (b[1] & 0xf0) === 16) || (b[0] === 192 && b[1] === 168);
    }
    return b.length === 16 && (b[0] & 0xfe) === 0xfc;
  }
  /** `0.0.0.0` or `::` (without zone). */
  isUnspecified(): boolean {
    return this.isValid() && this.#zone === "" && this.#b.every((x) => x === 0);
  }
  /**
   * Like Go: private and ULA addresses ARE global unicast; unspecified,
   * broadcast, loopback, multicast and link-local are not.
   */
  isGlobalUnicast(): boolean {
    const u = this.unmap();
    const b = u.#b;
    if (b.length === 0 || u.isUnspecified()) return false;
    if (b.length === 4 && b.every((x) => x === 255)) return false;
    return !u.isLoopback() && !u.isMulticast() && !u.isLinkLocalUnicast();
  }

  /** Orders by family (IPv4 first), then bytes, then zone. */
  compare(other: Addr): -1 | 0 | 1 {
    const a = this.#b;
    const b = other.#b;
    if (a.length !== b.length) return a.length < b.length ? -1 : 1;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return this.#zone < other.#zone ? -1 : this.#zone > other.#zone ? 1 : 0;
  }
  less(other: Addr): boolean {
    return this.compare(other) < 0;
  }
  equals(other: Addr): boolean {
    return this.compare(other) === 0;
  }

  /** Next address, or the invalid Addr on overflow. Keeps the zone. */
  next(): Addr {
    const b = this.#b.slice();
    for (let i = b.length - 1; i >= 0; i--) if (b[i]++ !== 0xff) return new Addr(b, this.#zone);
    return Addr.#invalid;
  }
  /** Previous address, or the invalid Addr on underflow. Keeps the zone. */
  prev(): Addr {
    const b = this.#b.slice();
    for (let i = b.length - 1; i >= 0; i--) if (b[i]-- !== 0) return new Addr(b, this.#zone);
    return Addr.#invalid;
  }

  /**
   * The masked prefix of length `bits` containing this address; zone dropped.
   * @throws {RangeError} if `bits` is outside `[0, bitLen()]`.
   */
  prefix(bits: number): Prefix {
    if (!this.isValid()) return Prefix.from(this, bits);
    if (!Number.isInteger(bits) || bits < 0 || bits > this.bitLen()) {
      throw new RangeError(`prefix length ${bits} out of range for ${this}`);
    }
    const b = this.#b.slice();
    for (let i = 0; i < b.length; i++) b[i] &= 0xff << (8 - clamp8(bits - 8 * i));
    return Prefix.from(new Addr(b), bits);
  }

  /** RFC 5952 text: `192.0.2.1`, `2001:db8::1`, `::ffff:1.2.3.4`, `fe80::1%eth0`, or `invalid IP`. */
  toString(): string {
    const b = this.#b;
    if (b.length === 0) return "invalid IP";
    if (b.length === 4) return b.join(".");
    const zone = this.#zone ? `%${this.#zone}` : "";
    if (this.is4In6()) return `::ffff:${b.subarray(12).join(".")}${zone}`;
    const g = groups(b);
    // Longest run (>= 2) of zero groups becomes "::"; first one wins ties.
    let start = -1;
    let len = 1;
    for (let i = 0; i < 8; ) {
      let j = i;
      while (j < 8 && g[j] === 0) j++;
      if (j - i > len) [start, len] = [i, j - i];
      i = j === i ? i + 1 : j;
    }
    const hex = g.map((x) => x.toString(16));
    const s = start < 0 ? hex.join(":") : `${hex.slice(0, start).join(":")}::${hex.slice(start + len).join(":")}`;
    return s + zone;
  }
  /** Like toString but IPv6 is fully expanded: `2001:0db8:0000:…`. */
  stringExpanded(): string {
    if (!this.is6()) return this.toString();
    const s = groups(this.#b).map((x) => x.toString(16).padStart(4, "0")).join(":");
    return this.#zone ? `${s}%${this.#zone}` : s;
  }
  /** Text form, or `""` for the invalid Addr (Go `MarshalText`). */
  toJSON(): string {
    return this.isValid() ? this.toString() : "";
  }
  /** 0, 4 or 16 bytes, followed by the UTF-8 zone if any. */
  marshalBinary(): Uint8Array {
    if (!this.#zone) return this.#b.slice();
    const z = new TextEncoder().encode(this.#zone);
    const out = new Uint8Array(16 + z.length);
    out.set(this.#b);
    out.set(z, 16);
    return out;
  }
}

/** An IP network in CIDR form, like Go's `netip.Prefix`. Host bits are kept unless {@link Prefix.masked}. */
export class Prefix {
  readonly #addr: Addr;
  /** -1 when invalid. */
  readonly #bits: number;

  private constructor(addr: Addr, bits: number) {
    this.#addr = addr;
    this.#bits = bits;
  }

  /**
   * Prefix from an address and length without masking host bits (Go `PrefixFrom`).
   * Zone is dropped; an out-of-range `bits` gives an invalid Prefix.
   */
  static from(addr: Addr, bits: number): Prefix {
    const ok = Number.isInteger(bits) && bits >= 0 && bits <= addr.bitLen();
    return new Prefix(addr.withZone(""), ok ? bits : -1);
  }

  /**
   * Parses `"192.0.2.0/24"` or `"2001:db8::/32"` (Go `ParsePrefix`). Host bits are
   * kept; zones and non-canonical lengths (`/024`, `/+8`) are rejected.
   * @throws {ParseError}
   */
  static parse(s: string): Prefix {
    const i = s.lastIndexOf("/");
    if (i < 0) throw new ParseError(s, "no '/'");
    const addr = Addr.parse(s.slice(0, i));
    if (addr.zone()) throw new ParseError(s, "IPv6 zones cannot be present in a prefix");
    const bits = s.slice(i + 1);
    if (!/^(0|[1-9]\d*)$/.test(bits)) throw new ParseError(s, `bad bits after slash: ${JSON.stringify(bits)}`);
    if (Number(bits) > addr.bitLen()) throw new ParseError(s, "prefix length out of range");
    return new Prefix(addr, Number(bits));
  }

  /** Inverse of {@link Prefix.marshalBinary}. */
  static unmarshalBinary(b: Uint8Array): Prefix {
    if (b.length === 0) return Prefix.from(Addr.fromSlice(b), 0);
    return Prefix.from(Addr.unmarshalBinary(b.subarray(0, -1)), b[b.length - 1]);
  }

  addr(): Addr {
    return this.#addr;
  }
  /** Prefix length, or -1 if invalid. */
  bits(): number {
    return this.#bits;
  }
  isValid(): boolean {
    return this.#addr.isValid() && this.#bits >= 0;
  }
  isSingleIP(): boolean {
    return this.isValid() && this.#bits === this.#addr.bitLen();
  }
  /** Same prefix with host bits zeroed; invalid stays invalid. */
  masked(): Prefix {
    return this.isValid() ? this.#addr.prefix(this.#bits) : this;
  }
  /** Whether `ip` is in this network. Families must match exactly and zoned IPs never match. */
  contains(ip: Addr): boolean {
    if (!this.isValid() || ip.zone() || ip.bitLen() !== this.#addr.bitLen()) return false;
    return ip.prefix(this.#bits).equals(this.masked());
  }
  /** Whether the two networks share any address. */
  overlaps(other: Prefix): boolean {
    if (!this.isValid() || !other.isValid() || this.#addr.bitLen() !== other.#addr.bitLen()) return false;
    const bits = Math.min(this.#bits, other.#bits);
    return this.#addr.prefix(bits).equals(other.#addr.prefix(bits));
  }
  /**
   * First and last address of the network (not in Go's netip).
   * @throws {RangeError} on an invalid Prefix.
   */
  range(): { from: Addr; to: Addr } {
    if (!this.isValid()) throw new RangeError("range of invalid Prefix");
    const from = this.masked().addr();
    const b = from.asSlice();
    for (let i = 0; i < b.length; i++) b[i] |= 0xff >> clamp8(this.#bits - 8 * i);
    return { from, to: Addr.fromSlice(b) };
  }
  equals(other: Prefix): boolean {
    return this.#bits === other.#bits && this.#addr.equals(other.#addr);
  }

  /** `192.0.2.0/24`, or `invalid Prefix`. */
  toString(): string {
    return this.isValid() ? `${this.#addr}/${this.#bits}` : "invalid Prefix";
  }
  /** Text form, or `""` if invalid (Go `MarshalText`). */
  toJSON(): string {
    return this.isValid() ? this.toString() : "";
  }
  /** Address bytes followed by one byte of prefix length. */
  marshalBinary(): Uint8Array {
    if (!this.isValid()) return new Uint8Array(0);
    const a = this.#addr.marshalBinary();
    const out = new Uint8Array(a.length + 1);
    out.set(a);
    out[a.length] = this.#bits;
    return out;
  }
}

/** An IP address and port, like Go's `netip.AddrPort`. */
export class AddrPort {
  readonly #addr: Addr;
  readonly #port: number;

  private constructor(addr: Addr, port: number) {
    this.#addr = addr;
    this.#port = port;
  }

  /**
   * @throws {RangeError} if `port` is not an integer in `[0, 65535]`.
   */
  static from(addr: Addr, port: number): AddrPort {
    if (!Number.isInteger(port) || port < 0 || port > 0xffff) throw new RangeError(`invalid port ${port}`);
    return new AddrPort(addr, port);
  }

  /**
   * Parses `"192.0.2.1:80"` or `"[2001:db8::1%eth0]:443"` (Go `ParseAddrPort`).
   * IPv6 must be bracketed; IPv4 must not be. No name resolution.
   * @throws {ParseError}
   */
  static parse(s: string): AddrPort {
    const i = s.lastIndexOf(":");
    if (i < 0) throw new ParseError(s, "not an ip:port");
    let ip = s.slice(0, i);
    const port = s.slice(i + 1);
    if (!ip) throw new ParseError(s, "no IP");
    if (!port) throw new ParseError(s, "no port");
    const bracketed = ip.startsWith("[");
    if (bracketed) {
      if (ip.length < 2 || !ip.endsWith("]")) throw new ParseError(s, "missing ]");
      ip = ip.slice(1, -1);
    }
    if (!/^\d+$/.test(port) || Number(port) > 0xffff) throw new ParseError(s, `invalid port ${JSON.stringify(port)}`);
    const addr = Addr.parse(ip);
    if (bracketed && addr.is4()) throw new ParseError(s, "square brackets can only be used with IPv6 addresses");
    if (!bracketed && addr.is6()) throw new ParseError(s, "IPv6 addresses must be surrounded by square brackets");
    return new AddrPort(addr, Number(port));
  }

  /** Inverse of {@link AddrPort.marshalBinary}. */
  static unmarshalBinary(b: Uint8Array): AddrPort {
    if (b.length < 2) throw new RangeError("AddrPort.unmarshalBinary: too short");
    return new AddrPort(Addr.unmarshalBinary(b.subarray(0, -2)), b[b.length - 2] | (b[b.length - 1] << 8));
  }

  addr(): Addr {
    return this.#addr;
  }
  port(): number {
    return this.#port;
  }
  isValid(): boolean {
    return this.#addr.isValid();
  }
  /** Orders by address, then port. */
  compare(other: AddrPort): -1 | 0 | 1 {
    const c = this.#addr.compare(other.#addr);
    if (c !== 0) return c;
    return this.#port < other.#port ? -1 : this.#port > other.#port ? 1 : 0;
  }
  equals(other: AddrPort): boolean {
    return this.compare(other) === 0;
  }

  /** `192.0.2.1:80`, `[::1]:80`, or `invalid AddrPort`. */
  toString(): string {
    if (!this.isValid()) return "invalid AddrPort";
    return this.#addr.is4() ? `${this.#addr}:${this.#port}` : `[${this.#addr}]:${this.#port}`;
  }
  /** Text form, or `""` if invalid (Go `MarshalText`). */
  toJSON(): string {
    return this.isValid() ? this.toString() : "";
  }
  /** Address bytes followed by the port as 2 little-endian bytes (Go wire format). */
  marshalBinary(): Uint8Array {
    const a = this.#addr.marshalBinary();
    const out = new Uint8Array(a.length + 2);
    out.set(a);
    out[a.length] = this.#port & 0xff;
    out[a.length + 1] = this.#port >> 8;
    return out;
  }
}

const clamp8 = (n: number) => Math.min(8, Math.max(0, n));

function groups(b: Uint8Array): number[] {
  return Array.from({ length: 8 }, (_, i) => (b[2 * i] << 8) | b[2 * i + 1]);
}

function parse4(s: string, input: string): Uint8Array {
  const fields = s.split(".");
  if (fields.length !== 4) throw new ParseError(input, "IPv4 address must have 4 fields");
  const out = new Uint8Array(4);
  fields.forEach((f, i) => {
    if (!/^(0|[1-9]\d{0,2})$/.test(f)) throw new ParseError(input, `invalid IPv4 field ${JSON.stringify(f)}`);
    if (Number(f) > 255) throw new ParseError(input, "IPv4 field has value >255");
    out[i] = Number(f);
  });
  return out;
}

function parse6(input: string): [Uint8Array, string] {
  let s = input;
  let zone = "";
  const pct = s.indexOf("%");
  if (pct >= 0) {
    zone = s.slice(pct + 1);
    s = s.slice(0, pct);
    if (!zone) throw new ParseError(input, "zone must be a non-empty string");
  }
  const ip = new Uint8Array(16);
  let ellipsis = -1;
  let i = 0;
  if (s.startsWith("::")) {
    ellipsis = 0;
    s = s.slice(2);
    if (!s) return [ip, zone];
  }
  while (i < 16) {
    const hex = /^[0-9a-fA-F]*/.exec(s)![0];
    if (!hex) throw new ParseError(input, "each colon-separated field must have at least one digit");
    if (s[hex.length] === ".") {
      if (ellipsis < 0 && i !== 12) {
        throw new ParseError(input, "embedded IPv4 address must replace the final 2 fields of the address");
      }
      if (i + 4 > 16) throw new ParseError(input, "too many hex fields to fit an embedded IPv4 at the end of the address");
      ip.set(parse4(s, input), i);
      i += 4;
      s = "";
      break;
    }
    if (hex.length > 4) throw new ParseError(input, "each group must have 4 or less digits");
    const v = parseInt(hex, 16);
    ip[i++] = v >> 8;
    ip[i++] = v & 0xff;
    s = s.slice(hex.length);
    if (!s) break;
    if (s[0] !== ":") throw new ParseError(input, "unexpected character, want colon");
    if (s.length === 1) throw new ParseError(input, "colon must be followed by more characters");
    s = s.slice(1);
    if (s[0] === ":") {
      if (ellipsis >= 0) throw new ParseError(input, "multiple :: in address");
      ellipsis = i;
      s = s.slice(1);
      if (!s) break;
    }
  }
  if (s) throw new ParseError(input, "trailing garbage after address");
  if (i < 16) {
    if (ellipsis < 0) throw new ParseError(input, "address string too short");
    const n = 16 - i;
    ip.copyWithin(ellipsis + n, ellipsis, i);
    ip.fill(0, ellipsis, ellipsis + n);
  } else if (ellipsis >= 0) {
    throw new ParseError(input, "the :: must expand to at least one field of zeros");
  }
  return [ip, zone];
}
