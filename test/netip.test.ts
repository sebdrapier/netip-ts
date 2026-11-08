import { describe, expect, test } from "bun:test";
import { Addr, AddrPort, ParseError, Prefix } from "../src";
import golden from "./golden.json";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const unhex = (s: string) => new Uint8Array(Buffer.from(s, "hex"));
const tryParse = <T>(f: () => T) => {
  try {
    return f();
  } catch (e) {
    expect(e).toBeInstanceOf(ParseError);
    return undefined;
  }
};

// Every case below is checked against Go's net/netip output (test/golden).
describe("Addr matches Go", () => {
  test.each(golden.Addrs.map((g) => [g.In, g] as const))("%p", (input, g) => {
    const a = tryParse(() => Addr.parse(input));
    expect(a !== undefined).toBe(g.Ok);
    if (!a) return;
    expect({
      In: input,
      Ok: true,
      String: a.toString(),
      Expanded: a.stringExpanded(),
      Zone: a.zone() || undefined,
      Next: a.next().toString(),
      Prev: a.prev().toString(),
      Binary: hex(a.marshalBinary()),
      JSON: a.toJSON(),
      Is4: a.is4(),
      Is6: a.is6(),
      Is4In6: a.is4In6(),
      Loopback: a.isLoopback(),
      Multicast: a.isMulticast(),
      IfaceLocalMC: a.isInterfaceLocalMulticast(),
      LLMC: a.isLinkLocalMulticast(),
      LLUnicast: a.isLinkLocalUnicast(),
      Private: a.isPrivate(),
      Unspecified: a.isUnspecified(),
      GlobalUnicast: a.isGlobalUnicast(),
      BitLen: a.bitLen(),
    }).toEqual(g as never);
    expect(Addr.unmarshalBinary(a.marshalBinary()).equals(a)).toBe(true);
  });
});

describe("Prefix matches Go", () => {
  const probes = golden.Probes.map((s) => Addr.parse(s));
  const parsed = golden.Prefixes.map((g) => tryParse(() => Prefix.parse(g.In)));
  test.each(golden.Prefixes.map((g, i) => [g.In, g, i] as const))("%p", (input, g, i) => {
    const p = parsed[i];
    expect(p !== undefined).toBe(g.Ok);
    const overlaps = parsed.map((q) => !!p && !!q && p.overlaps(q));
    expect(overlaps).toEqual(g.Overlaps);
    if (!p) return;
    expect(p.toString()).toBe(g.String!);
    expect(p.masked().toString()).toBe(g.Masked!);
    expect(hex(p.marshalBinary())).toBe(g.Binary!);
    expect(p.addr().toString()).toBe(g.Addr!);
    expect(p.bits()).toBe(g.Bits);
    expect(p.isSingleIP()).toBe(g.SingleIP);
    expect(probes.map((a) => p.contains(a))).toEqual(g.Contains!);
    expect(Prefix.unmarshalBinary(p.marshalBinary()).equals(p)).toBe(true);
  });
});

describe("AddrPort matches Go", () => {
  test.each(golden.AddrPorts.map((g) => [g.In, g] as const))("%p", (input, g) => {
    const ap = tryParse(() => AddrPort.parse(input));
    expect(ap !== undefined).toBe(g.Ok);
    if (!ap) return;
    expect(ap.toString()).toBe(g.String!);
    expect(hex(ap.marshalBinary())).toBe(g.Binary!);
    expect(ap.addr().toString()).toBe(g.Addr!);
    expect(ap.port()).toBe(g.Port);
    expect(AddrPort.unmarshalBinary(unhex(g.Binary!)).equals(ap)).toBe(true);
  });
});

test("constructors and conversions", () => {
  expect(Addr.from4(new Uint8Array([1, 2, 3, 4])).toString()).toBe("1.2.3.4");
  expect(() => Addr.from4(new Uint8Array(3))).toThrow(RangeError);
  expect(Addr.fromSlice(new Uint8Array(5)).isValid()).toBe(false);
  expect(Addr.ipv6LinkLocalAllRouters().toString()).toBe("ff02::2");
  const v4 = Addr.parse("1.2.3.4");
  expect(Addr.from16(v4.as16()).toString()).toBe("::ffff:1.2.3.4");
  expect(Addr.from16(v4.as16()).unmap().equals(v4)).toBe(true);
  expect(Array.from(Addr.parse("::ffff:1.2.3.4").as4())).toEqual([1, 2, 3, 4]);
  expect(() => Addr.parse("::1").as4()).toThrow(TypeError);
  expect(v4.withZone("eth0")).toBe(v4);
  expect(Addr.parse("fe80::1%eth0").withZone("").toString()).toBe("fe80::1");
  expect(Addr.parse("255.255.255.255").next().isValid()).toBe(false);
  expect(v4.prefix(16).toString()).toBe("1.2.0.0/16");
  expect(() => v4.prefix(33)).toThrow(RangeError);
  expect(JSON.stringify({ a: v4, p: v4.prefix(8) })).toBe('{"a":"1.2.3.4","p":"1.0.0.0/8"}');
});

test("ordering", () => {
  const sorted = ["::1", "1.2.3.4", "fe80::1%b", "0.0.0.0", "fe80::1%a", "fe80::1"]
    .map((s) => Addr.parse(s))
    .sort((a, b) => a.compare(b))
    .map(String);
  expect(sorted).toEqual(["0.0.0.0", "1.2.3.4", "::1", "fe80::1", "fe80::1%a", "fe80::1%b"]);
  const [a, b] = ["1.2.3.4:80", "1.2.3.4:443"].map((s) => AddrPort.parse(s));
  expect(a.compare(b)).toBe(-1);
});

test("Prefix.range", () => {
  const r = (s: string) => Object.values(Prefix.parse(s).range()).map(String);
  expect(r("192.168.1.42/24")).toEqual(["192.168.1.0", "192.168.1.255"]);
  expect(r("10.0.0.0/13")).toEqual(["10.0.0.0", "10.7.255.255"]);
  expect(r("2001:db8::/32")).toEqual(["2001:db8::", "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff"]);
  expect(r("1.2.3.4/32")).toEqual(["1.2.3.4", "1.2.3.4"]);
  expect(() => Prefix.from(Addr.parse("1.2.3.4"), 40).range()).toThrow(RangeError);
});

test("invalid values", () => {
  expect(Prefix.from(Addr.parse("1.2.3.4"), 33).isValid()).toBe(false);
  expect(Prefix.from(Addr.parse("fe80::1%eth0"), 64).toString()).toBe("fe80::1/64");
  expect(() => AddrPort.from(Addr.parse("::1"), 65536)).toThrow(RangeError);
  expect(AddrPort.from(Addr.fromSlice(new Uint8Array()), 1).toString()).toBe("invalid AddrPort");
  expect(() => Addr.parse("1.2.3.04")).toThrow('parse "1.2.3.04": invalid IPv4 field "04"');
});
