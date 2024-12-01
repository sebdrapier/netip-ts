import { describe, it, expect } from "bun:test";
import Address from "./address";

const extendedTestCases = [
  // IPv4 cases
  { input: "0.0.0.0", expected: "0.0.0.0", type: "IPv4", isValid: true },
  {
    input: "127.0.0.1",
    expected: "127.0.0.1",
    type: "Loopback IPv4",
    isValid: true,
  },
  { input: "8.8.8.8", expected: "8.8.8.8", type: "Public IPv4", isValid: true },
  {
    input: "255.255.255.256",
    expected: null,
    type: "Out-of-range IPv4",
    isValid: false,
  },
  {
    input: "192.168.0.01",
    expected: "192.168.0.1",
    type: "IPv4 with leading zeros",
    isValid: true,
  },
  {
    input: ".192.168.1",
    expected: null,
    type: "IPv4 missing leading field",
    isValid: false,
  },
  {
    input: "1.2..3.4",
    expected: null,
    type: "Malformed IPv4 with missing octet",
    isValid: false,
  },
  {
    input: "192.168.0.300",
    expected: null,
    type: "Out-of-range octet in IPv4",
    isValid: false,
  },
  {
    input: "1.1.1.1.",
    expected: null,
    type: "IPv4 with trailing dot",
    isValid: false,
  },

  // IPv6 cases
  { input: "::1", expected: "::1", type: "IPv6 loopback", isValid: true },
  {
    input: "1::",
    expected: "1::",
    type: "IPv6 with leading segment",
    isValid: true,
  },
  {
    input: "1:2:3:4:5:6:7:8",
    expected: "1:2:3:4:5:6:7:8",
    type: "Fully populated IPv6",
    isValid: true,
  },
  {
    input: "::ffff:192.168.1.1",
    expected: "::ffff:192.168.1.1",
    type: "IPv4-mapped IPv6",
    isValid: true,
  },
  {
    input: "::ffff:0:0",
    expected: "::ffff:0.0.0.0",
    type: "Embedded IPv4 zero address",
    isValid: true,
  },
  {
    input: "::1:2:3:4:5",
    expected: "::1:2:3:4:5",
    type: "Too few fields in IPv6",
    isValid: true,
  },
  {
    input: "1:2:3:4:5:6:7:8:9",
    expected: null,
    type: "Excessive fields in IPv6",
    isValid: false,
  },
  {
    input: "fe80::%eth0",
    expected: "fe80::%eth0",
    type: "Link-local IPv6 with zone",
    isValid: true,
  },
  {
    input: ":::",
    expected: null,
    type: "Malformed IPv6 with extra colons",
    isValid: false,
  },
  {
    input: "2001:db8:85a3:8d3:1319:8a2e:370:7348",
    expected: "2001:db8:85a3:8d3:1319:8a2e:370:7348",
    type: "Fully expanded IPv6",
    isValid: true,
  },
  {
    input: "2001:db8:85a3:8d3:1319:8a2e:370:7348::",
    expected: null,
    type: "Trailing :: in fully expanded IPv6",
    isValid: false,
  },
  {
    input: "::g1",
    expected: null,
    type: "Invalid character in IPv6",
    isValid: false,
  },

  // IPv4-mapped IPv6 cases
  {
    input: "::ffff:192.168.1.1",
    expected: "::ffff:192.168.1.1",
    type: "Valid IPv4-mapped IPv6",
    isValid: true,
  },
  {
    input: "::ffff:256.256.256.256",
    expected: null,
    type: "Out-of-range IPv4 in IPv6",
    isValid: false,
  },
  {
    input: "::ffff:192.168.1",
    expected: null,
    type: "Incomplete IPv4-mapped IPv6",
    isValid: false,
  },

  // Invalid cases
  {
    input: ":::1",
    expected: null,
    type: "Malformed IPv6 with extra colon",
    isValid: false,
  },
  {
    input: "1:2:3::4:5:6:7:8",
    expected: null,
    type: "Too many fields in IPv6",
    isValid: false,
  },
  {
    input: "abcd:1234::xyz",
    expected: null,
    type: "Invalid hex in IPv6",
    isValid: false,
  },
  {
    input: "2001:db8:::1",
    expected: null,
    type: "Malformed IPv6 with multiple ::",
    isValid: false,
  },
  {
    input: "192.168.1.1::",
    expected: null,
    type: "IPv4 with IPv6",
    isValid: false,
  },
  { input: "", expected: null, type: "Empty input", isValid: false },

  // Special cases
  {
    input: "192.168.1.1%eth0",
    expected: null,
    type: "IPv4 with zone identifier",
    isValid: false,
  },
  {
    input: "2001:db8::/64",
    expected: null,
    type: "CIDR notation not supported as input",
    isValid: false,
  },
  {
    input: "0:0:0:0:0:ffff:192.168.1.1",
    expected: "::ffff:192.168.1.1",
    type: "IPv6 with embedded IPv4",
    isValid: true,
  },

  // Edge cases
  {
    input: "::1%zone",
    expected: "::1%zone",
    type: "IPv6 with generic zone",
    isValid: true,
  },
  {
    input: "2001:db8::%lo",
    expected: "2001:db8::%lo",
    type: "IPv6 with zone identifier",
    isValid: true,
  },
  {
    input: "fe80::1ff:fe23:4567:890a",
    expected: "fe80::1ff:fe23:4567:890a",
    type: "Valid link-local IPv6",
    isValid: true,
  },
  {
    input: "0000:0000:0000:0000:0000:0000:0000:0001",
    expected: "::1",
    type: "Fully expanded IPv6 loopback",
    isValid: true,
  },
  {
    input: "::ffff:0102:0304",
    expected: "::ffff:1.2.3.4",
    type: "IPv6 with dotted IPv4 conversion",
    isValid: true,
  },
];

describe("Address Parsing and Validation", () => {
  extendedTestCases.forEach(({ input, expected, type, isValid }) => {
    it(`should correctly handle ${type} input: ${input}`, () => {
      if (isValid) {
        const address = Address.parseAddress(input);
        expect(address.toString()).toBe(expected);
        expect(address.isValid()).toBe(isValid);
      } else {
        expect(() => Address.parseAddress(input)).toThrowError();
      }
    });
  });
});
