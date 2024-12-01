# Address Library Documentation

netip-ts is a TypeScript implementation inspired by the Go netip library. It provides robust classes and methods for handling IPv4 and IPv6 addresses, prefixes (CIDR notation), and address-port combinations. With a focus on correctness and simplicity, it supports parsing, validation, serialization, and various utility functions to work with IP addresses effectively.

## Table of Contents

- [Overview](#overview)
- [Classes](#classes)
  - [Address](#address)
  - [AddressPrefix](#addressprefix)
  - [AddressPort](#addressport)
- [Installation](#installation)
- [Usage](#usage)
  - [Working with Addresses](#working-with-addresses)
  - [Working with Address Prefixes](#working-with-address-prefixes)
  - [Working with Address Ports](#working-with-address-ports)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Address Library is designed to provide a comprehensive solution for IP address manipulation in TypeScript applications. It supports:

- Parsing and validating IPv4 and IPv6 addresses from strings.
- Handling IPv6 zones (scope identifiers).
- Working with IP address prefixes (CIDR notation).
- Managing IP addresses with associated port numbers.
- Performing comparisons, serialization, and other utility operations.

## Classes

### Address

The `Address` class represents an immutable IP address, which can be either IPv4 or IPv6. It provides methods for parsing, validation, comparison, and serialization.

#### Key Features

- **Parsing**: Create an `Address` instance from a string representation.
- **Validation**: Check if an address is valid, unspecified, loopback, multicast, etc.
- **Comparison**: Compare two addresses for sorting or equality checks.
- **Serialization**: Convert addresses to and from binary or text formats.
- **Utility Methods**: Methods like `toIPv6Bytes()`, `mask()`, `unmap()`, and more.

### AddressPrefix

The `AddressPrefix` class represents an IP network prefix in CIDR notation. It combines an IP address with a prefix length.

#### Key Features

- **Parsing**: Create an `AddressPrefix` from a CIDR string like `"192.168.1.0/24"`.
- **Validation**: Check if a prefix is valid.
- **Containment**: Determine if a prefix contains a specific IP address.
- **Overlap Checking**: Check if two prefixes overlap.
- **Serialization**: Convert prefixes to and from binary or text formats.

### AddressPort

The `AddressPort` class represents a combination of an IP address and a port number.

#### Key Features

- **Parsing**: Create an `AddressPort` from a string like `"192.168.1.1:80"` or `"[2001:db8::1]:443"`.
- **Validation**: Check if the `AddressPort` is valid.
- **Comparison**: Compare two `AddressPort` instances.
- **Serialization**: Convert `AddressPort` instances to and from binary or text formats.

## Installation

To use the Address Library in your project, you can include the TypeScript files directly or compile them into your project.

1. **Clone or Download the Repository**: Copy the `Address`, `AddressPrefix`, and `AddressPort` classes into your project directory.

2. **Import the Classes**:

   ```typescript
   import Address from "./address";
   import AddressPrefix from "./addressPrefix";
   import AddressPort from "./addressPort";
   ```

## Usage

### Working with Addresses

#### Parsing an Address

```typescript
import Address from "./address";

try {
  const ipv4 = Address.parseAddress("192.168.1.1");
  const ipv6 = Address.parseAddress("2001:db8::1");
} catch (error) {
  console.error("Failed to parse address:", error.message);
}
```

#### Checking Address Type

```typescript
if (ipv4.isIPv4()) {
  console.log("This is an IPv4 address.");
}

if (ipv6.isIPv6()) {
  console.log("This is an IPv6 address.");
}
```

#### Validating Addresses

```typescript
if (ipv4.isValid()) {
  console.log("IPv4 address is valid.");
}

if (ipv6.isGlobalUnicast()) {
  console.log("IPv6 address is a global unicast address.");
}
```

#### Converting to String

```typescript
console.log("IPv4 address:", ipv4.toString()); // Output: 192.168.1.1
console.log("IPv6 address:", ipv6.toString()); // Output: 2001:db8::1
```

### Working with Address Prefixes

#### Parsing a Prefix

```typescript
import AddressPrefix from "./addressPrefix";

try {
  const prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
} catch (error) {
  console.error("Failed to parse prefix:", error.message);
}
```

#### Checking if an Address is in a Prefix

```typescript
const address = Address.parseAddress("192.168.1.42");
if (prefix.contains(address)) {
  console.log("Address is within the prefix.");
}
```

#### Getting the Network Masked Address

```typescript
const maskedPrefix = prefix.masked();
console.log("Masked prefix:", maskedPrefix.toString()); // Output: 192.168.1.0/24
```

### Working with Address Ports

#### Parsing an AddressPort

```typescript
import AddressPort from "./addressPort";

try {
  const addrPort = AddressPort.parseAddrPort("192.168.1.1:8080");
} catch (error) {
  console.error("Failed to parse AddrPort:", error.message);
}
```

#### Accessing IP and Port

```typescript
const ip = addrPort.getAddress();
const port = addrPort.getPort();
console.log("IP:", ip.toString());
console.log("Port:", port);
```

#### Serializing to String

```typescript
console.log("AddressPort:", addrPort.toString()); // Output: 192.168.1.1:8080
```

## Examples

### Parsing and Validating an IPv6 Address

```typescript
try {
  const ipv6Address = Address.parseAddress("fe80::1ff:fe23:4567:890a%eth0");
  console.log("IPv6 Address:", ipv6Address.toString());
  console.log("Zone:", ipv6Address.getZone());
} catch (error) {
  console.error("Error parsing IPv6 address:", error.message);
}
```

### Working with IPv4-mapped IPv6 Addresses

```typescript
const ipv4Mapped = Address.parseAddress("::ffff:192.0.2.128");
if (ipv4Mapped.isIPv4MappedIPv6()) {
  const ipv4 = ipv4Mapped.unmap();
  console.log("Unmapped IPv4 Address:", ipv4.toString()); // Output: 192.0.2.128
}
```

### Checking if an IP is within a CIDR Block

```typescript
const prefix = AddressPrefix.parsePrefix("10.0.0.0/8");
const ip = Address.parseAddress("10.1.2.3");

if (prefix.contains(ip)) {
  console.log(`${ip.toString()} is within ${prefix.toString()}`);
} else {
  console.log(`${ip.toString()} is not within ${prefix.toString()}`);
}
```

### Comparing Addresses

```typescript
const ip1 = Address.parseAddress("192.168.1.1");
const ip2 = Address.parseAddress("192.168.1.2");

if (ip1.compare(ip2) < 0) {
  console.log(`${ip1.toString()} is less than ${ip2.toString()}`);
}
```

### Serializing and Deserializing

```typescript
const ip = Address.parseAddress("192.168.1.1");
const binaryData = ip.marshalBinary();

const ip2 = new Address(new Uint8Array());
ip2.unmarshalBinary(binaryData);

console.log(ip2.toString()); // Output: 192.168.1.1
```

## Error Handling

The library methods throw standard `Error` exceptions when parsing fails or invalid data is encountered. You should use `try-catch` blocks to handle these exceptions gracefully.

```typescript
try {
  const invalidAddress = Address.parseAddress("invalid-ip");
} catch (error) {
  console.error("Error:", error.message);
}
```

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
