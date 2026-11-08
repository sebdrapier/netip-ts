# netip-ts

[![CI](https://github.com/sebdrapier/netip-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/sebdrapier/netip-ts/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/netip-ts)](https://www.npmjs.com/package/netip-ts)
[![bundle size](https://img.shields.io/bundlejs/size/netip-ts)](https://bundlejs.com/?q=netip-ts)
[![types](https://img.shields.io/npm/types/netip-ts)](https://www.npmjs.com/package/netip-ts)
[![license](https://img.shields.io/npm/l/netip-ts)](LICENSE)

Go's [`net/netip`](https://pkg.go.dev/net/netip) for TypeScript. It gives you immutable IPv4/IPv6 addresses, CIDR prefixes and `ip:port` pairs, and **its behavior is checked against Go's own implementation**.

- **Strict like Go.** It rejects `192.168.0.01` (octal ambiguity), `1.2.3`, `/024`, and zones in prefixes.
- **RFC 5952 output.** `2001:db8:0:0:1:0:0:1` prints as `2001:db8::1:0:0:1`.
- **IPv6 zones** (`fe80::1%eth0`) and **IPv4-mapped IPv6** (`::ffff:1.2.3.4`) are handled the way Go handles them.
- **Zero dependencies**, about 3 kB min+gzip, ESM + CJS, and runs on Node, Bun, Deno and browsers.

```sh
npm install netip-ts
```

## Usage

```ts
import { Addr, AddrPort, Prefix } from "netip-ts";

const ip = Addr.parse("2001:db8::1");
ip.is6();                 // true
ip.prefix(32).toString(); // "2001:db8::/32"

const net = Prefix.parse("10.0.0.0/8");
net.contains(Addr.parse("10.1.2.3"));        // true
net.overlaps(Prefix.parse("10.42.0.0/16"));  // true
net.range();                                  // { from: 10.0.0.0, to: 10.255.255.255 }

const ep = AddrPort.parse("[fe80::1%eth0]:443");
ep.addr().zone(); // "eth0"
ep.port();        // 443

Addr.parse("192.168.0.01"); // throws ParseError: invalid IPv4 field "01"
```

Values are immutable. Compare them with `equals()` or `compare()`, because `===` only compares references. `toJSON()` is implemented, so `JSON.stringify` gives the text form. To sort: `addrs.sort((a, b) => a.compare(b))`.

## API

The methods have the same names as Go's, in camelCase. A Go function that returns `(T, error)` becomes a static method that **throws** `ParseError` (which has `.input` and `.reason`) or `RangeError`.

| Go | netip-ts |
|---|---|
| `ParseAddr`, `AddrFrom4`, `AddrFrom16`, `AddrFromSlice` | `Addr.parse`, `Addr.from4`, `Addr.from16`, `Addr.fromSlice` |
| `IPv4Unspecified`, `IPv6Unspecified`, `IPv6Loopback`, `IPv6LinkLocalAllNodes`, `IPv6LinkLocalAllRouters` | same, as static methods on `Addr` |
| `Addr.Is4/Is6/Is4In6/Unmap/Zone/WithZone/BitLen` | `is4()` `is6()` `is4In6()` `unmap()` `zone()` `withZone()` `bitLen()` |
| `Addr.IsLoopback/IsMulticast/IsPrivate/IsGlobalUnicast/IsLinkLocalUnicast/…` | `isLoopback()` `isMulticast()` `isPrivate()` `isGlobalUnicast()` `isLinkLocalUnicast()` … |
| `Addr.As4/As16/AsSlice/Next/Prev/Prefix/Compare/Less` | `as4()` `as16()` `asSlice()` `next()` `prev()` `prefix()` `compare()` `less()` |
| `Addr.String/StringExpanded/MarshalText/MarshalBinary` | `toString()` `stringExpanded()` `toJSON()` `marshalBinary()` / `Addr.unmarshalBinary()` |
| `ParsePrefix`, `PrefixFrom` | `Prefix.parse`, `Prefix.from` |
| `Prefix.Addr/Bits/IsValid/IsSingleIP/Masked/Contains/Overlaps` | `addr()` `bits()` `isValid()` `isSingleIP()` `masked()` `contains()` `overlaps()` |
| `ParseAddrPort`, `AddrPortFrom` | `AddrPort.parse`, `AddrPort.from` |
| `AddrPort.Addr/Port/IsValid/Compare` | `addr()` `port()` `isValid()` `compare()` |
| `==` | `equals()` |
| — | `Prefix.range()`: first and last address of the network |

The binary encodings are byte-for-byte the same as Go's `MarshalBinary`, so values can be sent between Go and TS services.

## Correctness

[`test/golden/main.go`](test/golden/main.go) runs ~110 tricky inputs through Go's `net/netip` and records every result: parse success, string forms, all predicates, next/prev, containment, overlaps and binary encoding. The test suite asserts that netip-ts produces identical output, and CI regenerates the file with the latest Go to catch any drift.

## Migrating from 1.x

v2 is a rewrite that adopts Go's names and Go's strictness. The changes:

- `Address` → `Addr`, `AddressPrefix` → `Prefix`, `AddressPort` → `AddrPort`
- `parseAddress`/`parsePrefix`/`parseAddrPort` → `parse`. The `mustParse*` methods are removed, since `parse` already throws.
- `getAddress()`/`getBits()`/`getPort()`/`getZone()` → `addr()`/`bits()`/`port()`/`zone()`, `previous()` → `prev()`
- `getRanges()` → `range()`, which returns `Addr` objects instead of strings
- `mask(bits)` → `prefix(bits).addr()`. The constructors are now private (use `from*`/`parse`), and the `marshalText`/`unmarshal*` instance methods are gone in favor of `toJSON()` and the static `unmarshalBinary()`.
- **Behavior fixes that follow Go:** leading-zero IPv4 octets are rejected, private addresses now count as global unicast, the predicates unmap `::ffff:` addresses, IPv6 output follows RFC 5952 (v1 compressed the wrong run of zeros), IPv4-mapped `AddrPort`s print with brackets, and trailing garbage such as `1.2.3.4x` is rejected.

## License

[MIT](LICENSE)
