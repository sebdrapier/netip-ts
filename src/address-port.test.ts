import { expect, test } from "bun:test";
import Address from "./address";
import AddressPort from "./address-port";

// Test AddressPort.from
test("AddressPort.from - valid input", () => {
  const ip = Address.parseAddress("192.168.1.1");
  const port = 8080;
  const addrPort = AddressPort.from(ip, port);
  expect(addrPort.toString()).toBe("192.168.1.1:8080");
});

// Test AddressPort.parseAddrPort - IPv4
test("AddressPort.parseAddrPort - valid IPv4 input", () => {
  const addrPort = AddressPort.parseAddrPort("192.168.1.1:8080");
  expect(addrPort.getAddress().toString()).toBe("192.168.1.1");
  expect(addrPort.getPort()).toBe(8080);
});

// Test AddressPort.parseAddrPort - IPv6
test("AddressPort.parseAddrPort - valid IPv6 input", () => {
  const addrPort = AddressPort.parseAddrPort("[2001:db8::1]:443");
  expect(addrPort.getAddress().toString()).toBe("2001:db8::1");
  expect(addrPort.getPort()).toBe(443);
});

// Test AddressPort.parseAddrPort - IPv4-mapped IPv6
test("AddressPort.parseAddrPort - IPv4-mapped IPv6 input", () => {
  const addrPort = AddressPort.parseAddrPort("[::ffff:192.0.2.1]:80");
  expect(addrPort.getAddress().toString()).toBe("::ffff:192.0.2.1");
  expect(addrPort.getPort()).toBe(80);
});

// Test AddressPort.parseAddrPort - invalid format
test("AddressPort.parseAddrPort - invalid input", () => {
  expect(() => AddressPort.parseAddrPort("invalid-input")).toThrow(
    "Invalid AddrPort format: invalid-input"
  );
});

// Test AddressPort.parseAddrPort - invalid port
test("AddressPort.parseAddrPort - invalid port", () => {
  expect(() => AddressPort.parseAddrPort("192.168.1.1:notaport")).toThrow(
    "Invalid port number: notaport"
  );
});

// Test AddressPort.mustParseAddrPort - valid input
test("AddressPort.mustParseAddrPort - valid input", () => {
  const addrPort = AddressPort.mustParseAddrPort("8.8.8.8:53");
  expect(addrPort.getAddress().toString()).toBe("8.8.8.8");
  expect(addrPort.getPort()).toBe(53);
});

// Test AddressPort.mustParseAddrPort - invalid input
test("AddressPort.mustParseAddrPort - invalid input", () => {
  expect(() => AddressPort.mustParseAddrPort("invalid-input")).toThrow(
    "Failed to parse AddrPort: Invalid AddrPort format: invalid-input"
  );
});

// Test getAddress and getPort
test("AddressPort.getAddress and getPort", () => {
  const addrPort = AddressPort.parseAddrPort("127.0.0.1:3000");
  expect(addrPort.getAddress().toString()).toBe("127.0.0.1");
  expect(addrPort.getPort()).toBe(3000);
});

// Test toString
test("AddressPort.toString - IPv4", () => {
  const addrPort = AddressPort.parseAddrPort("192.0.2.1:80");
  expect(addrPort.toString()).toBe("192.0.2.1:80");
});

test("AddressPort.toString - IPv6", () => {
  const addrPort = AddressPort.parseAddrPort("[::1]:8080");
  expect(addrPort.toString()).toBe("[::1]:8080");
});

// Test compare
test("AddressPort.compare", () => {
  const addrPort1 = AddressPort.parseAddrPort("192.168.1.1:80");
  const addrPort2 = AddressPort.parseAddrPort("192.168.1.1:8080");
  const addrPort3 = AddressPort.parseAddrPort("10.0.0.1:80");

  expect(addrPort1.compare(addrPort2)).toBe(-1);
  expect(addrPort1.compare(addrPort3)).toBe(1);
  expect(addrPort1.compare(addrPort1)).toBe(0);
});

// Test isValid
test("AddressPort.isValid", () => {
  const validAddrPort = AddressPort.parseAddrPort("8.8.8.8:53");
  expect(validAddrPort.isValid()).toBe(true);

  const invalidAddress = new Address(new Uint8Array());
  const invalidAddrPort = new AddressPort(invalidAddress, 80);
  expect(invalidAddrPort.isValid()).toBe(false);
});

// Test marshalBinary and unmarshalBinary
test("AddressPort.marshalBinary and unmarshalBinary", () => {
  const addrPort = AddressPort.parseAddrPort("192.168.1.1:8080");
  const binaryData = addrPort.marshalBinary();

  const newAddrPort = new AddressPort(new Address(new Uint8Array()), 0);
  newAddrPort.unmarshalBinary(binaryData);

  expect(newAddrPort.toString()).toBe("192.168.1.1:8080");
});

// Test marshalText and unmarshalText
test("AddressPort.marshalText and unmarshalText", () => {
  const addrPort = AddressPort.parseAddrPort("[2001:db8::1]:443");
  const textData = addrPort.marshalText();

  const newAddrPort = new AddressPort(new Address(new Uint8Array()), 0);
  newAddrPort.unmarshalText(new TextDecoder().decode(textData));

  expect(newAddrPort.toString()).toBe("[2001:db8::1]:443");
});

// Test appendTo
test("AddressPort.appendTo", () => {
  const addrPort = AddressPort.parseAddrPort("127.0.0.1:3000");
  const buffer = new Uint8Array([1, 2, 3]);
  const newBuffer = addrPort.appendTo(buffer);

  const textEncoder = new TextEncoder();
  const expectedBuffer = new Uint8Array([
    1,
    2,
    3,
    ...textEncoder.encode("127.0.0.1:3000"),
  ]);

  expect(newBuffer).toEqual(expectedBuffer);
});

// Test invalid operations
test("AddressPort.unmarshalBinary - invalid data", () => {
  const addrPort = new AddressPort(new Address(new Uint8Array()), 0);
  expect(() => addrPort.unmarshalBinary(new Uint8Array([1, 2]))).toThrow(
    "Invalid binary address format."
  );
});

// Test port boundaries
test("AddressPort.parseAddrPort - port boundaries", () => {
  const addrPortMin = AddressPort.parseAddrPort("192.168.1.1:0");
  expect(addrPortMin.getPort()).toBe(0);

  const addrPortMax = AddressPort.parseAddrPort("192.168.1.1:65535");
  expect(addrPortMax.getPort()).toBe(65535);

  expect(() => AddressPort.parseAddrPort("192.168.1.1:-1")).toThrow(
    "Invalid port number: -1"
  );
  expect(() => AddressPort.parseAddrPort("192.168.1.1:65536")).toThrow(
    "Invalid port number: 65536"
  );
});

// Test with invalid IP address
test("AddressPort.parseAddrPort - invalid IP address", () => {
  expect(() => AddressPort.parseAddrPort("999.999.999.999:80")).toThrow(
    "Invalid IPv4 address component: 999"
  );
});

// Test toString with invalid AddrPort
test("AddressPort.toString - invalid AddrPort", () => {
  const invalidAddress = new Address(new Uint8Array());
  const addrPort = new AddressPort(invalidAddress, 80);
  expect(addrPort.toString()).toBe("");
});

// Test IPv6 address without brackets (should fail)
test("AddressPort.parseAddrPort - IPv6 without brackets", () => {
  expect(() => AddressPort.parseAddrPort("::1:80")).toThrow(
    "Invalid AddrPort format: ::1:80"
  );
});
