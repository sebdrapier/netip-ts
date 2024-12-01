import { expect, test } from "bun:test";
import Address from "./address";
import AddressPrefix from "./address-prefix";

// Test AddressPrefix.parsePrefix - valid IPv4
test("AddressPrefix.parsePrefix - valid IPv4 input", () => {
  const prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
  expect(prefix.toString()).toBe("192.168.1.0/24");
  expect(prefix.getBits()).toBe(24);
  expect(prefix.getAddress().toString()).toBe("192.168.1.0");
});

// Test AddressPrefix.parsePrefix - valid IPv6
test("AddressPrefix.parsePrefix - valid IPv6 input", () => {
  const prefix = AddressPrefix.parsePrefix("2001:db8::/32");
  expect(prefix.toString()).toBe("2001:db8::/32");
  expect(prefix.getBits()).toBe(32);
  expect(prefix.getAddress().toString()).toBe("2001:db8::");
});

// Test AddressPrefix.parsePrefix - invalid format
test("AddressPrefix.parsePrefix - invalid input", () => {
  expect(() => AddressPrefix.parsePrefix("invalid-input")).toThrow(
    "Invalid prefix format: invalid-input"
  );
});

// Test AddressPrefix.parsePrefix - invalid prefix length
test("AddressPrefix.parsePrefix - invalid prefix length", () => {
  expect(() => AddressPrefix.parsePrefix("192.168.1.0/notanumber")).toThrow(
    "Invalid prefix length: notanumber"
  );
});

// Test AddressPrefix.mustParsePrefix - valid input
test("AddressPrefix.mustParsePrefix - valid input", () => {
  const prefix = AddressPrefix.mustParsePrefix("10.0.0.0/8");
  expect(prefix.toString()).toBe("10.0.0.0/8");
});

// Test AddressPrefix.mustParsePrefix - invalid input
test("AddressPrefix.mustParsePrefix - invalid input", () => {
  expect(() => AddressPrefix.mustParsePrefix("invalid-input")).toThrow(
    "Failed to parse prefix: Invalid prefix format: invalid-input"
  );
});

// Test AddressPrefix.from
test("AddressPrefix.from - valid input", () => {
  const address = Address.parseAddress("192.168.1.0");
  const bits = 24;
  const prefix = AddressPrefix.from(address, bits);
  expect(prefix.toString()).toBe("192.168.1.0/24");
});

// Test getAddress and getBits
test("AddressPrefix.getAddress and getBits", () => {
  const prefix = AddressPrefix.parsePrefix("2001:db8::/32");
  expect(prefix.getAddress().toString()).toBe("2001:db8::");
  expect(prefix.getBits()).toBe(32);
});

// Test isValid
test("AddressPrefix.isValid", () => {
  const validPrefix = AddressPrefix.parsePrefix("192.168.1.0/24");
  expect(validPrefix.isValid()).toBe(true);

  const invalidAddress = new Address(new Uint8Array());
  const invalidPrefix = new AddressPrefix(invalidAddress, 24);
  expect(invalidPrefix.isValid()).toBe(false);

  const invalidBitsPrefix = AddressPrefix.from(
    Address.parseAddress("192.168.1.0"),
    33
  );
  expect(invalidBitsPrefix.isValid()).toBe(false);
});

// Test isSingleIP
test("AddressPrefix.isSingleIP", () => {
  const singleIpPrefix = AddressPrefix.parsePrefix("10.0.0.1/32");
  expect(singleIpPrefix.isSingleIP()).toBe(true);

  const nonSingleIpPrefix = AddressPrefix.parsePrefix("10.0.0.0/24");
  expect(nonSingleIpPrefix.isSingleIP()).toBe(false);
});

// Test contains
test("AddressPrefix.contains", () => {
  const prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
  const insideAddress = Address.parseAddress("192.168.1.42");
  const outsideAddress = Address.parseAddress("192.168.2.1");

  expect(prefix.contains(insideAddress)).toBe(true);
  expect(prefix.contains(outsideAddress)).toBe(false);
});

// Test overlaps
test("AddressPrefix.overlaps", () => {
  const prefix1 = AddressPrefix.parsePrefix("192.168.1.0/24");
  const prefix2 = AddressPrefix.parsePrefix("192.168.1.128/25");
  const prefix3 = AddressPrefix.parsePrefix("192.168.2.0/24");

  expect(prefix1.overlaps(prefix2)).toBe(true);
  expect(prefix1.overlaps(prefix3)).toBe(false);
});

// Test masked
test("AddressPrefix.masked", () => {
  const prefix = AddressPrefix.parsePrefix("192.168.1.42/24");
  const maskedPrefix = prefix.masked();
  expect(maskedPrefix.toString()).toBe("192.168.1.0/24");
});

// Test marshalBinary and unmarshalBinary
test("AddressPrefix.marshalBinary and unmarshalBinary", () => {
  const prefix = AddressPrefix.parsePrefix("2001:db8::/32");
  const binaryData = prefix.marshalBinary();

  const newPrefix = new AddressPrefix(new Address(new Uint8Array()), -1);
  newPrefix.unmarshalBinary(binaryData);

  expect(newPrefix.toString()).toBe("2001:db8::/32");
});

// Test marshalText and unmarshalText
test("AddressPrefix.marshalText and unmarshalText", () => {
  const prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
  const textData = prefix.marshalText();

  const newPrefix = new AddressPrefix(new Address(new Uint8Array()), -1);
  newPrefix.unmarshalText(new TextDecoder().decode(textData));

  expect(newPrefix.toString()).toBe("192.168.1.0/24");
});

// Test appendTo
test("AddressPrefix.appendTo", () => {
  const prefix = AddressPrefix.parsePrefix("10.0.0.0/8");
  const buffer = new Uint8Array([1, 2, 3]);
  const newBuffer = prefix.appendTo(buffer);

  const textEncoder = new TextEncoder();
  const expectedBuffer = new Uint8Array([
    1,
    2,
    3,
    ...textEncoder.encode("10.0.0.0/8"),
  ]);

  expect(newBuffer).toEqual(expectedBuffer);
});

// Test invalid operations
test("AddressPrefix.marshalBinary - invalid prefix", () => {
  const invalidPrefix = new AddressPrefix(new Address(new Uint8Array()), -1);
  expect(() => invalidPrefix.marshalBinary()).toThrow(
    "Invalid Prefix cannot be marshaled."
  );
});

test("AddressPrefix.unmarshalBinary - invalid data", () => {
  const prefix = new AddressPrefix(new Address(new Uint8Array()), -1);
  expect(() => prefix.unmarshalBinary(new Uint8Array([1, 2, 3]))).toThrow(
    "Invalid binary data for Prefix."
  );
});

// Test with invalid IP address
test("AddressPrefix.parsePrefix - invalid IP address", () => {
  expect(() => AddressPrefix.parsePrefix("999.999.999.999/24")).toThrow(
    "Invalid IPv4 address component: 999"
  );
});

// Test toString with invalid AddressPrefix
test("AddressPrefix.toString - invalid AddressPrefix", () => {
  const invalidAddress = new Address(new Uint8Array());
  const prefix = new AddressPrefix(invalidAddress, 24);
  expect(prefix.toString()).toBe("");
});

// Test contains with different IP versions
test("AddressPrefix.contains - different IP versions", () => {
  const ipv4Prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
  const ipv6Address = Address.parseAddress("::1");
  expect(ipv4Prefix.contains(ipv6Address)).toBe(false);
});

// Test overlaps with different IP versions
test("AddressPrefix.overlaps - different IP versions", () => {
  const ipv4Prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
  const ipv6Prefix = AddressPrefix.parsePrefix("2001:db8::/32");
  expect(ipv4Prefix.overlaps(ipv6Prefix)).toBe(false);
});

// Test bits boundaries
test("AddressPrefix.parsePrefix - bits boundaries", () => {
  const minPrefix = AddressPrefix.parsePrefix("0.0.0.0/0");
  expect(minPrefix.getBits()).toBe(0);

  const maxPrefixIPv4 = AddressPrefix.parsePrefix("255.255.255.255/32");
  expect(maxPrefixIPv4.getBits()).toBe(32);

  const maxPrefixIPv6 = AddressPrefix.parsePrefix(
    "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/128"
  );
  expect(maxPrefixIPv6.getBits()).toBe(128);

  expect(() => AddressPrefix.parsePrefix("192.168.1.0/-1")).toThrow(
    "Invalid prefix length: -1"
  );
  expect(() => AddressPrefix.parsePrefix("192.168.1.0/33")).toThrow(
    "Invalid prefix length: 33"
  );
});

// Test masked with IPv6
test("AddressPrefix.masked - IPv6", () => {
  const prefix = AddressPrefix.parsePrefix("2001:db8::1/32");
  const maskedPrefix = prefix.masked();
  expect(maskedPrefix.toString()).toBe("2001:db8::/32");
});

// Test invalid mask length in Address.mask
test("Address.mask - invalid mask length", () => {
  const address = Address.parseAddress("192.168.1.1");
  expect(() => address.mask(33)).toThrow("Invalid mask length: 33");
});

// Test masked with invalid prefix
test("AddressPrefix.masked - invalid prefix", () => {
  const invalidAddress = new Address(new Uint8Array());
  const invalidPrefix = new AddressPrefix(invalidAddress, 24);
  const maskedPrefix = invalidPrefix.masked();
  expect(maskedPrefix.isValid()).toBe(false);
  expect(maskedPrefix.toString()).toBe("");
});
