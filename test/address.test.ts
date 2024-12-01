import Address from "../src/address";
import { expect, test } from "bun:test";

// Test IPv4 address creation from bytes
test("Address.fromIPv4Bytes - valid input", () => {
  const bytes = new Uint8Array([192, 168, 1, 1]);
  const address = Address.fromIPv4Bytes(bytes);
  expect(address.isValid()).toBe(true);
  expect(address.toString()).toBe("192.168.1.1");
});

test("Address.fromIPv4Bytes - invalid input (wrong length)", () => {
  const bytes = new Uint8Array([192, 168, 1]);
  expect(() => Address.fromIPv4Bytes(bytes)).toThrow(
    "IPv4 address must be exactly 4 bytes."
  );
});

test("Address.fromIPv4Bytes - invalid input (too long)", () => {
  const bytes = new Uint8Array([192, 168, 1, 1, 5]);
  expect(() => Address.fromIPv4Bytes(bytes)).toThrow(
    "IPv4 address must be exactly 4 bytes."
  );
});

// Test IPv6 address creation from bytes
test("Address.fromIPv6Bytes - valid input", () => {
  const bytes = new Uint8Array(16);
  bytes[15] = 1;
  const address = Address.fromIPv6Bytes(bytes);
  expect(address.toString()).toBe("::1");
});

test("Address.fromIPv6Bytes - invalid input (wrong length)", () => {
  const bytes = new Uint8Array(15);
  expect(() => Address.fromIPv6Bytes(bytes)).toThrow(
    "IPv6 address must be exactly 16 bytes."
  );
});

// Test fromByteArray
test("Address.fromByteArray - valid IPv4 input", () => {
  const bytes = new Uint8Array([8, 8, 8, 8]);
  const result = Address.fromByteArray(bytes);
  expect(result.isValid).toBe(true);
  expect(result.address?.toString()).toBe("8.8.8.8");
});

test("Address.fromByteArray - valid IPv6 input", () => {
  const bytes = new Uint8Array(16);
  bytes[15] = 1;
  const result = Address.fromByteArray(bytes);
  expect(result.isValid).toBe(true);
  expect(result.address?.toString()).toBe("::1");
});

test("Address.fromByteArray - invalid input", () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const result = Address.fromByteArray(bytes);
  expect(result.isValid).toBe(false);
  expect(result.address).toBeNull();
});

// Test predefined addresses
test("Address.ipv4Unspecified", () => {
  const address = Address.ipv4Unspecified();
  expect(address.toString()).toBe("0.0.0.0");
});

test("Address.ipv6Unspecified", () => {
  const address = Address.ipv6Unspecified();
  expect(address.toString()).toBe("::");
});

test("Address.ipv6Loopback", () => {
  const address = Address.ipv6Loopback();
  expect(address.toString()).toBe("::1");
});

// Test parseAddress
test("Address.parseAddress - valid IPv4", () => {
  const address = Address.parseAddress("192.168.1.1");
  expect(address.toString()).toBe("192.168.1.1");
});

test("Address.parseAddress - valid IPv6", () => {
  const address = Address.parseAddress("2001:0db8::1");
  expect(address.toString()).toBe("2001:db8::1");
});

test("Address.parseAddress - invalid input", () => {
  expect(() => Address.parseAddress("invalid-address")).toThrow(
    "Invalid IP address format: invalid-address"
  );
});

// Test mustParseAddress
test("Address.mustParseAddress - valid input", () => {
  const address = Address.mustParseAddress("8.8.8.8");
  expect(address.toString()).toBe("8.8.8.8");
});

test("Address.mustParseAddress - invalid input", () => {
  expect(() => Address.mustParseAddress("invalid-address")).toThrow(
    "Failed to parse address: Invalid IP address format: invalid-address"
  );
});

// Test toByteArray
test("Address.toByteArray", () => {
  const address = Address.parseAddress("127.0.0.1");
  const bytes = address.toByteArray();
  expect(bytes).toEqual(new Uint8Array([127, 0, 0, 1]));
});

// Test toIPv4Bytes
test("Address.toIPv4Bytes - IPv4 address", () => {
  const address = Address.parseAddress("192.0.2.1");
  const bytes = address.toIPv4Bytes();
  expect(bytes).toEqual(new Uint8Array([192, 0, 2, 1]));
});

test("Address.toIPv4Bytes - IPv6 address", () => {
  const address = Address.parseAddress("::1");
  expect(() => address.toIPv4Bytes()).toThrow("Address is not IPv4.");
});

// Test toIPv6Bytes
test("Address.toIPv6Bytes - IPv6 address", () => {
  const address = Address.parseAddress("::1");
  const bytes = address.toIPv6Bytes();
  expect(bytes.length).toBe(16);
  expect(bytes[15]).toBe(1);
});

test("Address.toIPv6Bytes - IPv4 address", () => {
  const address = Address.parseAddress("192.0.2.1");
  const bytes = address.toIPv6Bytes();

  expect(bytes.length).toBe(16);
  expect(bytes.slice(0, 10)).toEqual(new Uint8Array(10)); // First 12 bytes are zeros
  expect(bytes[10]).toBe(0xff);
  expect(bytes[11]).toBe(0xff);
  expect(bytes.slice(12)).toEqual(new Uint8Array([192, 0, 2, 1]));
});

// Test isIPv4, isIPv6, isIPv4MappedIPv6
test("Address.isIPv4", () => {
  const ipv4Address = Address.parseAddress("192.168.1.1");
  expect(ipv4Address.isIPv4()).toBe(true);
  expect(ipv4Address.isIPv6()).toBe(false);

  const ipv6Address = Address.parseAddress("::1");
  expect(ipv6Address.isIPv4()).toBe(false);
  expect(ipv6Address.isIPv6()).toBe(true);
});

test("Address.isIPv4MappedIPv6 - valid", () => {
  const address = Address.parseAddress("::ffff:192.0.2.1");
  console.log(address.toString(), address.toByteArray());
  expect(address.isIPv4MappedIPv6()).toBe(true);
  expect(address.toString()).toBe("::ffff:192.0.2.1");
});

test("Address.isIPv4MappedIPv6 - invalid (no mapping)", () => {
  const address = Address.parseAddress("::1");
  expect(address.isIPv4MappedIPv6()).toBe(false);
});

test("Address.isIPv4MappedIPv6 - invalid (IPv4 only)", () => {
  const address = Address.parseAddress("192.0.2.1");
  expect(address.isIPv4MappedIPv6()).toBe(false);
});

// Test isLoopback
test("Address.isLoopback", () => {
  const ipv4Loopback = Address.parseAddress("127.0.0.1");
  expect(ipv4Loopback.isLoopback()).toBe(true);

  const ipv6Loopback = Address.parseAddress("::1");
  expect(ipv6Loopback.isLoopback()).toBe(true);

  const nonLoopback = Address.parseAddress("8.8.8.8");
  expect(nonLoopback.isLoopback()).toBe(false);
});

// Test isMulticast
test("Address.isMulticast", () => {
  const ipv4Multicast = Address.parseAddress("224.0.0.1");
  expect(ipv4Multicast.isMulticast()).toBe(true);

  const ipv6Multicast = Address.parseAddress("ff02::1");
  expect(ipv6Multicast.isMulticast()).toBe(true);

  const nonMulticast = Address.parseAddress("192.168.1.1");
  expect(nonMulticast.isMulticast()).toBe(false);
});

// Test isPrivate
test("Address.isPrivate", () => {
  const privateIPv4 = Address.parseAddress("192.168.1.1");
  expect(privateIPv4.isPrivate()).toBe(true);

  const publicIPv4 = Address.parseAddress("8.8.8.8");
  expect(publicIPv4.isPrivate()).toBe(false);

  const privateIPv6 = Address.parseAddress("fc00::1");
  expect(privateIPv6.isPrivate()).toBe(true);

  const publicIPv6 = Address.parseAddress("2001:db8::1");
  expect(publicIPv6.isPrivate()).toBe(false);
});

// Test isUnspecified
test("Address.isUnspecified", () => {
  const ipv4Unspecified = Address.parseAddress("0.0.0.0");
  expect(ipv4Unspecified.isUnspecified()).toBe(true);

  const ipv6Unspecified = Address.parseAddress("::");
  expect(ipv6Unspecified.isUnspecified()).toBe(true);

  const specifiedAddress = Address.parseAddress("192.168.1.1");
  expect(specifiedAddress.isUnspecified()).toBe(false);
});

// Test next and previous
test("Address.next - IPv4", () => {
  const address = Address.parseAddress("192.168.1.1");
  const nextAddress = address.next();
  expect(nextAddress.toString()).toBe("192.168.1.2");
});

test("Address.previous - IPv4", () => {
  const address = Address.parseAddress("192.168.1.1");
  const prevAddress = address.previous();
  expect(prevAddress.toString()).toBe("192.168.1.0");
});

test("Address.next - IPv6", () => {
  const address = Address.parseAddress("::1");
  const nextAddress = address.next();
  expect(nextAddress.toString()).toBe("::2");
});

test("Address.previous - IPv6", () => {
  const address = Address.parseAddress("::1");
  const prevAddress = address.previous();
  expect(prevAddress.toString()).toBe("::");
});

// Test compare and lessThan
test("Address.compare and lessThan", () => {
  const address1 = Address.parseAddress("192.168.1.1");
  const address2 = Address.parseAddress("192.168.1.2");
  expect(address1.compare(address2)).toBe(-1);
  expect(address1.lessThan(address2)).toBe(true);

  const address3 = Address.parseAddress("192.168.1.1");
  expect(address1.compare(address3)).toBe(0);
  expect(address1.lessThan(address3)).toBe(false);
});

// Test unmap
test("Address.unmap", () => {
  const mappedAddress = Address.parseAddress("::ffff:192.0.2.1");
  const unmappedAddress = mappedAddress.unmap();
  expect(unmappedAddress.toString()).toBe("192.0.2.1");
});

// Test marshalBinary and unmarshalBinary
test("Address.marshalBinary and unmarshalBinary", () => {
  const address = Address.parseAddress("192.168.1.1");
  const binaryData = address.marshalBinary();
  expect(binaryData).toEqual(new Uint8Array([192, 168, 1, 1]));

  const newAddress = new Address(new Uint8Array());
  newAddress.unmarshalBinary(binaryData);
  expect(newAddress.toString()).toBe("192.168.1.1");
});

// Test marshalText and unmarshalText
test("Address.marshalText and unmarshalText", () => {
  const address = Address.parseAddress("2001:db8::1");
  const textData = address.marshalText();
  expect(new TextDecoder().decode(textData)).toBe("2001:db8::1");

  const newAddress = new Address(new Uint8Array());
  newAddress.unmarshalText("2001:db8::1");
  expect(newAddress.toString()).toBe("2001:db8::1");
});

// Test withZone and getZone
test("Address.withZone and getZone", () => {
  const address = Address.parseAddress("fe80::1");
  const zonedAddress = address.withZone("eth0");
  expect(zonedAddress.getZone()).toBe("eth0");
  expect(zonedAddress.toString()).toBe("fe80::1%eth0");

  const noZoneAddress = zonedAddress.withZone("");
  expect(noZoneAddress.getZone()).toBe("");
  expect(noZoneAddress.toString()).toBe("fe80::1");
});

// Test invalid operations
test("Address.toIPv6Bytes on invalid address", () => {
  const invalidAddress = new Address(new Uint8Array());
  expect(() => invalidAddress.toIPv6Bytes()).toThrow("Invalid address.");
});

test("Address.next on invalid address", () => {
  const invalidAddress = new Address(new Uint8Array());
  const nextAddress = invalidAddress.next();
  expect(nextAddress.isValid()).toBe(false);
});

test("Address.isValid", () => {
  const invalidAddress = new Address(new Uint8Array());
  expect(invalidAddress.isValid()).toBe(false);

  const validIPv4Address = Address.parseAddress("192.168.1.1");
  expect(validIPv4Address.isValid()).toBe(true);

  const validIPv6Address = Address.parseAddress("::1");
  expect(validIPv6Address.isValid()).toBe(true);
});
