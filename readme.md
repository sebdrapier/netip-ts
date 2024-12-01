# netip-ts Documentation

**netip-ts** is a TypeScript library inspired by the Go `netip` package. It provides robust classes and methods for handling IPv4 and IPv6 addresses, prefixes (CIDR notation), and address-port combinations. With a focus on correctness and simplicity, it supports parsing, validation, serialization, and various utility functions to work with IP addresses effectively.

## Table of Contents

- [Installation](#installation)
- [Overview](#overview)
- [Classes](#classes)
  - [Address](#address)
    - [Methods](#address-methods)
    - [Usage Examples](#address-usage-examples)
  - [AddressPrefix](#addressprefix)
    - [Methods](#addressprefix-methods)
    - [Usage Examples](#addressprefix-usage-examples)
  - [AddressPort](#addressport)
    - [Methods](#addressport-methods)
    - [Usage Examples](#addressport-usage-examples)
- [Contributing](#contributing)
- [License](#license)

## Installation

You can install **netip-ts** via npm:

```bash
npm install netip-ts
```

## Overview

The **netip-ts** library provides the following key classes:

- **Address**: Represents an immutable IP address (IPv4 or IPv6).
- **AddressPrefix**: Represents an IP address prefix in CIDR notation, defining an IP network.
- **AddressPort**: Represents a combination of an IP address and a port number.

These classes come with a variety of methods to parse, validate, compare, and manipulate IP addresses and networks.

## Classes

### Address

The `Address` class represents an immutable IP address, either IPv4 or IPv6. It provides methods for parsing, validation, serialization, and various utility functions.

#### Address Properties

- **addressBytes**: The raw bytes of the address (`Uint8Array`). For IPv4, this is 4 bytes; for IPv6, this is 16 bytes.
- **zone** (optional): The zone information for scoped IPv6 addresses.

#### Address Methods

- **Static Methods:**

  - `parseAddress(input: string): Address`  
    Parses a string representation of an IP address.
  - `fromIPv4Bytes(bytes: Uint8Array): Address`  
    Creates an `Address` instance from IPv4 bytes.
  - `fromIPv6Bytes(bytes: Uint8Array): Address`  
    Creates an `Address` instance from IPv6 bytes.
  - `ipv4Unspecified(): Address`  
    Returns the IPv4 unspecified address (`0.0.0.0`).
  - `ipv6Unspecified(): Address`  
    Returns the IPv6 unspecified address (`::`).
  - `ipv6Loopback(): Address`  
    Returns the IPv6 loopback address (`::1`).

- **Instance Methods:**
  - `toString(): string`  
    Converts the address to its string representation.
  - `toByteArray(): Uint8Array`  
    Returns the raw byte representation of the address.
  - `isValid(): boolean`  
    Checks if the address is valid.
  - `isIPv4(): boolean`  
    Checks if the address is an IPv4 address.
  - `isIPv6(): boolean`  
    Checks if the address is an IPv6 address.
  - `mask(bits: number): Address`  
    Applies a network mask to the address, keeping only the top 'bits' bits.
  - `compare(other: Address): number`  
    Compares the address with another `Address` instance.
  - `getZone(): string`  
    Gets the zone associated with the address, if any.
  - `withZone(zone: string): Address`  
    Returns a new `Address` with the specified zone.
  - `unmap(): Address`  
    Removes the IPv4-mapped IPv6 prefix if present.

#### Address Usage Examples

##### Parsing an IP Address

```typescript
import Address from "netip-ts";

const ipv4Address = Address.parseAddress("192.168.1.1");
console.log(ipv4Address.toString()); // Output: "192.168.1.1"

const ipv6Address = Address.parseAddress("2001:db8::1");
console.log(ipv6Address.toString()); // Output: "2001:db8::1"
```

##### Checking Address Type

```typescript
if (ipv4Address.isIPv4()) {
  console.log("This is an IPv4 address.");
}

if (ipv6Address.isIPv6()) {
  console.log("This is an IPv6 address.");
}
```

##### Applying a Network Mask

```typescript
const maskedAddress = ipv4Address.mask(24);
console.log(maskedAddress.toString()); // Output: "192.168.1.0"
```

##### Comparing Addresses

```typescript
const addressA = Address.parseAddress("192.168.1.1");
const addressB = Address.parseAddress("192.168.1.2");

if (addressA.compare(addressB) === -1) {
  console.log(`${addressA.toString()} is less than ${addressB.toString()}`);
}
```

### AddressPrefix

The `AddressPrefix` class represents an IP address prefix in CIDR notation, defining an IP network.

#### AddressPrefix Properties

- **address**: The `Address` instance representing the network address.
- **bits**: The prefix length in bits. Range: [0, 32] for IPv4, [0, 128] for IPv6.

#### AddressPrefix Methods

- **Static Methods:**

  - `parsePrefix(input: string): AddressPrefix`  
    Parses a string as a Prefix (e.g., `"192.168.1.0/24"`).
  - `from(address: Address, bits: number): AddressPrefix`  
    Creates a Prefix from the provided IP address and prefix length.

- **Instance Methods:**
  - `toString(): string`  
    Converts the Prefix to its CIDR notation string representation.
  - `contains(ip: Address): boolean`  
    Checks if the Prefix contains the given IP address.
  - `isValid(): boolean`  
    Checks if the Prefix is valid.
  - `isSingleIP(): boolean`  
    Checks if the Prefix represents exactly one IP address.
  - `masked(): AddressPrefix`  
    Returns the Prefix in its canonical form, with all but the high bits masked off.
  - `overlaps(other: AddressPrefix): boolean`  
    Checks if this Prefix overlaps with another Prefix.
  - `getRange(): { from: string; to: string }`  
    Calculates the range of IP addresses within the CIDR prefix.

#### AddressPrefix Usage Examples

##### Parsing a Prefix

```typescript
import { AddressPrefix } from "netip-ts";

const prefix = AddressPrefix.parsePrefix("192.168.1.0/24");
console.log(prefix.toString()); // Output: "192.168.1.0/24"
```

##### Checking if an IP is within a Prefix

```typescript
import Address from "netip-ts";

const ip = Address.parseAddress("192.168.1.42");

if (prefix.contains(ip)) {
  console.log(`${ip.toString()} is within the prefix ${prefix.toString()}`);
}
```

##### Getting the IP Range of a Prefix

```typescript
const range = prefix.getRange();
console.log(`From: ${range.from}, To: ${range.to}`);
// Output: "From: 192.168.1.0, To: 192.168.1.255"
```

##### Checking for Overlaps

```typescript
const prefixA = AddressPrefix.parsePrefix("192.168.1.0/24");
const prefixB = AddressPrefix.parsePrefix("192.168.1.128/25");

if (prefixA.overlaps(prefixB)) {
  console.log("Prefixes overlap.");
}
```

##### Working with IPv6 Prefixes

```typescript
const ipv6Prefix = AddressPrefix.parsePrefix("2001:db8::/32");
const range = ipv6Prefix.getRange();
console.log(`From: ${range.from}, To: ${range.to}`);
// Output: "From: 2001:db8::, To: 2001:db8:ffff:ffff:ffff:ffff:ffff:ffff"
```

### AddressPort

The `AddressPort` class represents a combination of an IP address and a port number.

#### AddressPort Properties

- **ip**: The `Address` instance representing the IP address.
- **port**: The port number (`number`).

#### AddressPort Methods

- **Static Methods:**

  - `parseAddrPort(input: string): AddressPort`  
    Parses a string as an `AddressPort` (e.g., `"192.168.1.1:8080"`).
  - `from(ip: Address, port: number): AddressPort`  
    Creates an `AddressPort` instance from the provided IP address and port.

- **Instance Methods:**
  - `toString(): string`  
    Converts the `AddressPort` to its string representation.
  - `isValid(): boolean`  
    Checks if the `AddressPort` is valid.
  - `getAddress(): Address`  
    Returns the IP address component.
  - `getPort(): number`  
    Returns the port number component.
  - `compare(other: AddressPort): number`  
    Compares this `AddressPort` with another.

#### AddressPort Usage Examples

##### Parsing an Address and Port

```typescript
import { AddressPort } from "netip-ts";

const addrPort = AddressPort.parseAddrPort("192.168.1.1:8080");
console.log(addrPort.toString()); // Output: "192.168.1.1:8080"
```

##### Working with IPv6 Addresses

```typescript
const ipv6AddrPort = AddressPort.parseAddrPort("[2001:db8::1]:443");
console.log(ipv6AddrPort.toString()); // Output: "[2001:db8::1]:443"
```

##### Validating an AddressPort

```typescript
if (addrPort.isValid()) {
  console.log("The AddressPort is valid.");
}
```

##### Comparing AddressPorts

```typescript
const addrPortA = AddressPort.parseAddrPort("192.168.1.1:80");
const addrPortB = AddressPort.parseAddrPort("192.168.1.1:443");

if (addrPortA.compare(addrPortB) === -1) {
  console.log(`${addrPortA.toString()} is less than ${addrPortB.toString()}`);
}
```

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.

### Setting Up the Development Environment

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/sebdrapier/netip-ts.git
   ```

2. **Install Dependencies:**

   ```bash
   cd netip-ts
   npm install
   ```

3. **Run Tests:**

   ```bash
   npm test
   ```

### Guidelines

- **Coding Standards:** Follow the existing coding style and conventions.
- **Testing:** Add unit tests for any new features or bug fixes.
- **Documentation:** Update the documentation if you make changes to the API.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

_Note: Replace `https://github.com/sebastienfilion/netip-ts.git` with the actual repository URL if it's different._
