/**
 * Represents an IPv4 or IPv6 address, supporting immutability and comparability.
 */
export class Address {
  /**
   * The raw bytes of the address.
   * For IPv4, this is 4 bytes. For IPv6, this is 16 bytes.
   */
  private addressBytes: Uint8Array;

  /**
   * The zone information for IPv6 scoped addresses (optional).
   */
  private zone?: string;

  /**
   * Creates an instance of the Address class.
   * @param addressBytes - The raw bytes representing the address.
   * @param zone - The optional zone for scoped IPv6 addresses.
   */
  constructor(addressBytes: Uint8Array, zone?: string) {
    this.addressBytes = addressBytes;
    this.zone = zone;
  }

  // Static Methods

  /**
   * Creates an Address instance from IPv4 bytes.
   * @param bytes - A 4-byte Uint8Array representing an IPv4 address.
   * @returns A new Address instance.
   */
  static fromIPv4Bytes(bytes: Uint8Array): Address {
    if (bytes.length !== 4) {
      throw new Error("IPv4 address must be exactly 4 bytes.");
    }
    return new Address(bytes);
  }
  /**
   * Creates an Address instance from IPv6 bytes.
   * @param bytes - A 16-byte Uint8Array representing an IPv6 address.
   * @returns A new Address instance.
   */
  static fromIPv6Bytes(bytes: Uint8Array): Address {
    if (bytes.length !== 16) {
      throw new Error("IPv6 address must be exactly 16 bytes.");
    }
    return new Address(bytes);
  }
  /**
   * Parses a byte array as either an IPv4 or IPv6 address.
   * @param bytes - A 4-byte or 16-byte Uint8Array.
   * @returns An object containing the Address instance and a validity flag.
   */
  static fromByteArray(bytes: Uint8Array): {
    address: Address | null;
    isValid: boolean;
  } {
    if (bytes.length === 4 || bytes.length === 16) {
      return { address: new Address(bytes), isValid: true };
    } else {
      return { address: null, isValid: false };
    }
  }
  /**
   * Returns the IPv4 unspecified address (0.0.0.0).
   * @returns An Address instance for the unspecified IPv4 address.
   */
  static ipv4Unspecified(): Address {
    return new Address(new Uint8Array(4));
  }
  /**
   * Returns the IPv6 link-local all nodes multicast address (ff02::1).
   * @returns An Address instance for the all-nodes IPv6 multicast address.
   */
  static ipv6LinkLocalAllNodes(): Address {
    const bytes = new Uint8Array(16);
    bytes[0] = 0xff;
    bytes[1] = 0x02;
    bytes[15] = 0x01;
    return new Address(bytes);
  }
  /**
   * Returns the IPv6 link-local all routers multicast address (ff02::2).
   * @returns An Address instance for the all-routers IPv6 multicast address.
   */
  static ipv6LinkLocalAllRouters(): Address {
    const bytes = new Uint8Array(16);
    bytes[0] = 0xff;
    bytes[1] = 0x02;
    bytes[15] = 0x02;
    return new Address(bytes);
  }
  /**
   * Returns the IPv6 loopback address (::1).
   * @returns An Address instance for the IPv6 loopback address.
   */
  static ipv6Loopback(): Address {
    const bytes = new Uint8Array(16);
    bytes[15] = 0x01;
    return new Address(bytes);
  }
  /**
   * Returns the IPv6 unspecified address (::).
   * @returns An Address instance for the unspecified IPv6 address.
   */
  static ipv6Unspecified(): Address {
    return new Address(new Uint8Array(16));
  }
  /**
   * Parses a string representation of an IP address.
   * @param input - The IP address string in dotted decimal or colon-separated notation.
   * @returns A new Address instance.
   */
  static parseAddress(input: string): Address {
    if (input.includes(":")) {
      return Address.parseIPv6Address(input);
    } else if (input.includes(".")) {
      return Address.parseIPv4Address(input);
    } else {
      throw new Error(`Invalid IP address format: ${input}`);
    }
  }
  /**
   * Parses an IP address string and throws an error if parsing fails.
   * @param input - The IP address string to parse.
   * @returns A new Address instance.
   */
  static mustParseAddress(input: string): Address {
    try {
      return Address.parseAddress(input);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse address: ${error.message}`);
      } else {
        throw new Error("Failed to parse address: An unknown error occurred.");
      }
    }
  }

  // Instance Methods

  /**
   * Appends the address to a buffer.
   * @param buffer - A Uint8Array to append the address to.
   * @returns The updated buffer.
   */
  appendTo(buffer: Uint8Array): Uint8Array {
    const newBuffer = new Uint8Array(buffer.length + this.addressBytes.length);
    newBuffer.set(buffer);
    newBuffer.set(this.addressBytes, buffer.length);
    return newBuffer;
  }
  /**
   * Returns the 16-byte representation of the address (IPv6).
   * For IPv4 addresses, this returns the IPv4-mapped IPv6 format.
   * @returns A 16-byte Uint8Array.
   */
  toIPv6Bytes(): Uint8Array {
    if (this.isIPv6()) {
      return this.addressBytes.slice();
    } else if (this.isIPv4()) {
      // Convert to IPv4-mapped IPv6 address
      const bytes = new Uint8Array(16);
      bytes[10] = 0xff;
      bytes[11] = 0xff;
      bytes.set(this.addressBytes, 12);
      return bytes;
    } else {
      throw new Error("Invalid address.");
    }
  }
  /**
   * Returns the 4-byte representation of the address (IPv4).
   * Throws an error if called on an IPv6 address.
   * @returns A 4-byte Uint8Array.
   */
  toIPv4Bytes(): Uint8Array {
    if (this.isIPv4()) {
      return this.addressBytes.slice();
    } else {
      throw new Error("Address is not IPv4.");
    }
  }
  /**
   * Returns the raw byte representation of the address.
   * @returns A 4-byte or 16-byte Uint8Array.
   */
  toByteArray(): Uint8Array {
    return this.addressBytes.slice();
  }
  /**
   * Returns the number of bits in the address: 32 for IPv4, 128 for IPv6.
   * @returns The bit length of the address.
   */
  bitLength(): number {
    if (this.isIPv4()) {
      return 32;
    } else if (this.isIPv6()) {
      return 128;
    } else {
      return 0;
    }
  }
  /**
   * Compares the address with another Address instance.
   * @param other - The other Address instance to compare.
   * @returns 0 if equal, -1 if less, +1 if greater.
   */
  compare(other: Address): number {
    const len = Math.min(this.addressBytes.length, other.addressBytes.length);
    for (let i = 0; i < len; i++) {
      if (this.addressBytes[i] < other.addressBytes[i]) {
        return -1;
      } else if (this.addressBytes[i] > other.addressBytes[i]) {
        return 1;
      }
    }
    if (this.addressBytes.length < other.addressBytes.length) {
      return -1;
    } else if (this.addressBytes.length > other.addressBytes.length) {
      return 1;
    }
    return 0;
  }
  /**
   * Checks if the address is an IPv4 address.
   * @returns True if the address is IPv4, false otherwise.
   */
  isIPv4(): boolean {
    return this.addressBytes.length === 4;
  }
  /**
   * Checks if the address is an IPv4-mapped IPv6 address.
   * @returns True if the address is an IPv4-mapped IPv6 address, false otherwise.
   */
  isIPv4MappedIPv6(): boolean {
    if (this.addressBytes.length !== 16) {
      return false;
    }
    for (let i = 0; i < 10; i++) {
      if (this.addressBytes[i] !== 0) {
        return false;
      }
    }
    return this.addressBytes[10] === 0xff && this.addressBytes[11] === 0xff;
  }
  /**
   * Checks if the address is an IPv6 address.
   * @returns True if the address is IPv6, false otherwise.
   */
  isIPv6(): boolean {
    return this.addressBytes.length === 16;
  }
  /**
   * Checks if the address is a global unicast address.
   * @returns True if the address is global unicast, false otherwise.
   */
  isGlobalUnicast(): boolean {
    if (this.isIPv4()) {
      return (
        !this.isPrivate() &&
        !this.isUnspecified() &&
        !this.isLoopback() &&
        !this.isMulticast()
      );
    } else if (this.isIPv6()) {
      return (
        !this.isUnspecified() &&
        !this.isLoopback() &&
        !this.isMulticast() &&
        !this.isLinkLocalUnicast()
      );
    }
    return false;
  }
  /**
   * Checks if the address is an IPv6 interface-local multicast address.
   * @returns True if the address is interface-local multicast, false otherwise.
   */
  isInterfaceLocalMulticast(): boolean {
    if (!this.isIPv6()) return false;
    return (
      this.addressBytes[0] === 0xff && (this.addressBytes[1] & 0x0f) === 0x01
    );
  }
  /**
   * Checks if the address is a link-local multicast address.
   * @returns True if the address is link-local multicast, false otherwise.
   */
  isLinkLocalMulticast(): boolean {
    if (this.isIPv4()) {
      return (
        this.addressBytes[0] === 224 &&
        this.addressBytes[1] === 0 &&
        this.addressBytes[2] === 0
      );
    } else if (this.isIPv6()) {
      return (
        this.addressBytes[0] === 0xff && (this.addressBytes[1] & 0x0f) === 0x02
      );
    }
    return false;
  }
  /**
   * Checks if the address is a link-local unicast address.
   * @returns True if the address is link-local unicast, false otherwise.
   */
  isLinkLocalUnicast(): boolean {
    if (this.isIPv4()) {
      return this.addressBytes[0] === 169 && this.addressBytes[1] === 254;
    } else if (this.isIPv6()) {
      return (
        this.addressBytes[0] === 0xfe && (this.addressBytes[1] & 0xc0) === 0x80
      );
    }
    return false;
  }
  /**
   * Checks if the address is a loopback address.
   * @returns True if the address is loopback, false otherwise.
   */
  isLoopback(): boolean {
    if (this.isIPv4()) {
      return this.addressBytes[0] === 127;
    } else if (this.isIPv6()) {
      for (let i = 0; i < 15; i++) {
        if (this.addressBytes[i] !== 0) {
          return false;
        }
      }
      return this.addressBytes[15] === 1;
    }
    return false;
  }
  /**
   * Checks if the address is a multicast address.
   * @returns True if the address is multicast, false otherwise.
   */
  isMulticast(): boolean {
    if (this.isIPv4()) {
      return (this.addressBytes[0] & 0xf0) === 0xe0;
    } else if (this.isIPv6()) {
      return this.addressBytes[0] === 0xff;
    }
    return false;
  }
  /**
   * Checks if the address is a private address.
   * @returns True if the address is private, false otherwise.
   */
  isPrivate(): boolean {
    if (this.isIPv4()) {
      const first = this.addressBytes[0];
      const second = this.addressBytes[1];
      return (
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
      );
    } else if (this.isIPv6()) {
      return this.addressBytes[0] === 0xfc || this.addressBytes[0] === 0xfd;
    }
    return false;
  }
  /**
   * Checks if the address is unspecified.
   * @returns True if the address is unspecified, false otherwise.
   */
  isUnspecified(): boolean {
    for (let byte of this.addressBytes) {
      if (byte !== 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the address is valid.
   * @returns True if the address is valid, false otherwise.
   */
  isValid(): boolean {
    return this.addressBytes.length === 4 || this.addressBytes.length === 16;
  }
  /**
   * Compares the address with another Address instance for sorting.
   * @param other - The other Address instance.
   * @returns True if the address is less than the other.
   */
  lessThan(other: Address): boolean {
    return this.compare(other) === -1;
  }
  /**
   * Serializes the address into a binary format.
   * @returns A Uint8Array containing the serialized address.
   */
  marshalBinary(): Uint8Array {
    return this.addressBytes.slice();
  }
  /**
   * Serializes the address into a textual format.
   * @returns A Uint8Array containing the serialized address.
   */
  marshalText(): Uint8Array {
    return new TextEncoder().encode(this.toString());
  }
  /**
   * Returns the next address in sequence.
   * @returns The next Address instance or an invalid address if none exists.
   */
  next(): Address {
    const bytes = this.addressBytes.slice();
    for (let i = bytes.length - 1; i >= 0; i--) {
      if (bytes[i] < 255) {
        bytes[i]++;
        return new Address(bytes, this.zone);
      } else {
        bytes[i] = 0;
      }
    }
    return new Address(new Uint8Array());
  }
  /**
   * Returns the previous address in sequence.
   * @returns The previous Address instance or an invalid address if none exists.
   */
  previous(): Address {
    const bytes = this.addressBytes.slice();
    for (let i = bytes.length - 1; i >= 0; i--) {
      if (bytes[i] > 0) {
        bytes[i]--;
        return new Address(bytes, this.zone);
      } else {
        bytes[i] = 255;
      }
    }
    return new Address(new Uint8Array());
  }
  /**
   * Converts the address to its string representation.
   * @returns The string representation of the address.
   */
  toString(): string {
    if (this.isIPv4()) {
      return Array.from(this.addressBytes).join(".");
    } else if (this.isIPv6()) {
      const parts = [];
      for (let i = 0; i < 16; i += 2) {
        const part = (this.addressBytes[i] << 8) | this.addressBytes[i + 1];
        parts.push(part.toString(16));
      }
      let address = parts.join(":").replace(/(^|:)0(:0)*(:|$)/, "::");

      // Handle IPv4-mapped IPv6 addresses
      if (this.isIPv4MappedIPv6()) {
        const ipv4Bytes = Array.from(this.addressBytes.slice(12, 16));
        const ipv4 = ipv4Bytes.join(".");
        address = `::ffff:${ipv4}`;
      }

      if (this.zone) {
        address += `%${this.zone}`;
      }
      return address;
    } else {
      return "invalid IP";
    }
  }

  /**
   * Converts the address to an expanded string representation.
   * @returns The expanded string representation of the address.
   */
  toExpandedString(): string {
    if (this.isIPv4()) {
      return Array.from(this.addressBytes).join(".");
    } else if (this.isIPv6()) {
      const parts = [];
      for (let i = 0; i < 16; i += 2) {
        const part = (this.addressBytes[i] << 8) | this.addressBytes[i + 1];
        parts.push(part.toString(16).padStart(4, "0"));
      }
      let address = parts.join(":");
      if (this.zone) {
        address += `%${this.zone}`;
      }
      return address;
    } else {
      return "invalid IP";
    }
  }
  /**
   * Removes the IPv4-mapped IPv6 prefix if present.
   * @returns A new Address instance without the IPv4-mapped prefix.
   */
  unmap(): Address {
    if (this.isIPv4MappedIPv6()) {
      const ipv4Bytes = this.addressBytes.slice(12, 16);
      return new Address(ipv4Bytes);
    }
    return this;
  }
  /**
   * Deserializes a binary-encoded address.
   * @param buffer - The binary data to deserialize.
   */
  unmarshalBinary(buffer: Uint8Array): void {
    if (buffer.length === 4 || buffer.length === 16) {
      this.addressBytes = buffer.slice();
    } else {
      throw new Error("Invalid binary address format.");
    }
  }
  /**
   * Deserializes a textual-encoded address.
   * @param text - The textual data to deserialize.
   */
  unmarshalText(text: string): void {
    const addr = Address.parseAddress(text);
    this.addressBytes = addr.addressBytes;
    this.zone = addr.zone;
  }
  /**
   * Returns a new Address with the specified zone.
   * @param zone - The zone to associate with the address.
   * @returns A new Address instance with the zone.
   */
  withZone(zone: string): Address {
    if (!this.isIPv6()) {
      return this;
    }
    return new Address(this.addressBytes, zone);
  }
  /**
   * Gets the zone associated with the address, if any.
   * @returns The zone string or an empty string if no zone exists.
   */
  getZone(): string {
    return this.zone || "";
  }

  /**
   * Applies a network mask to the address, keeping only the top 'bits' bits.
   * @param bits - The number of bits to keep.
   * @returns A new Address instance with the masked address.
   * @throws An error if the mask length is invalid.
   */
  mask(bits: number): Address {
    const totalBits = this.bitLength();

    if (bits < 0 || bits > totalBits) {
      throw new Error(`Invalid mask length: ${bits}`);
    }

    if (!this.isValid()) {
      return new Address(new Uint8Array());
    }

    const maskedBytes = this.addressBytes.slice();

    for (let i = 0; i < totalBits; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      if (i >= bits) {
        maskedBytes[byteIndex] &= ~(1 << bitIndex);
      }
    }

    return new Address(maskedBytes, this.zone);
  }

  // Private Methods

  /**
   * Parses a string as an IPv4 address.
   * @param input - The IPv4 address string.
   * @returns A new Address instance.
   */
  private static parseIPv4Address(input: string): Address {
    if (input.includes("%")) {
      throw new Error(`Invalid IPv4 addressclea `);
    }

    const parts = input.split(".");
    if (parts.length !== 4) {
      throw new Error(`Invalid IPv4 address: ${input}`);
    }
    const bytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      const num = parseInt(parts[i], 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error(`Invalid IPv4 address component: ${parts[i]}`);
      }
      bytes[i] = num;
    }

    return new Address(bytes);
  }

  /**
   * Parses a string as an IPv6 address.
   * @param inStr - The IPv6 address string.
   * @returns A new Address instance.
   */
  private static parseIPv6Address(inStr: string): Address {
    let s = inStr;

    // Split off the zone right from the start.
    let zone = "";
    let zoneIndex = s.indexOf("%");
    if (zoneIndex !== -1) {
      zone = s.substring(zoneIndex + 1);
      s = s.substring(0, zoneIndex);
      if (zone === "") {
        throw new Error("Zone must be a non-empty string");
      }
    }

    const ip = new Uint8Array(16);
    let ellipsis = -1;

    // Might have leading ellipsis
    if (s.length >= 2 && s.charAt(0) === ":" && s.charAt(1) === ":") {
      ellipsis = 0;
      s = s.substring(2);
      // Might be only ellipsis
      if (s.length === 0) {
        return Address.ipv6Unspecified().withZone(zone);
      }
    }

    // Loop, parsing hex numbers followed by colon.
    zoneIndex = 0;
    while (zoneIndex < 16) {
      // Hex number.
      let off = 0;
      let acc = 0;
      for (; off < s.length; off++) {
        const c = s.charAt(off);
        const ccode = s.charCodeAt(off);
        if (c >= "0" && c <= "9") {
          acc = (acc << 4) + (ccode - "0".charCodeAt(0));
        } else if (c >= "a" && c <= "f") {
          acc = (acc << 4) + (ccode - "a".charCodeAt(0) + 10);
        } else if (c >= "A" && c <= "F") {
          acc = (acc << 4) + (ccode - "A".charCodeAt(0) + 10);
        } else {
          break;
        }
        if (off > 3) {
          throw new Error("Each group must have 4 or fewer digits");
        }
        if (acc > 0xffff) {
          throw new Error("IPv6 field has value >= 2^16");
        }
      }
      if (off === 0) {
        throw new Error(
          "Each colon-separated field must have at least one digit"
        );
      }

      if (off < s.length && s.charAt(off) === ".") {
        if (ellipsis < 0 && zoneIndex !== 12) {
          throw new Error(
            "Embedded IPv4 address must replace the final 2 fields of the address"
          );
        }
        if (zoneIndex + 4 > 16) {
          throw new Error(
            "Too many hex fields to fit an embedded IPv4 at the end of the address"
          );
        }
        const ipv4Str = s;
        Address.parseIPv4Fields(ipv4Str, ip.subarray(zoneIndex, zoneIndex + 4));
        s = "";
        zoneIndex += 4;
        break;
      }

      // Save this 16-bit chunk.
      ip[zoneIndex] = acc >> 8;
      ip[zoneIndex + 1] = acc & 0xff;
      zoneIndex += 2;

      // Stop at end of string.
      s = s.substring(off);
      if (s.length === 0) {
        break;
      }

      // Otherwise must be followed by colon and more.
      if (s.charAt(0) !== ":") {
        throw new Error("Unexpected character, expected colon");
      } else if (s.length === 1) {
        throw new Error("Colon must be followed by more characters");
      }
      s = s.substring(1);

      // Look for ellipsis.
      if (s.charAt(0) === ":") {
        if (ellipsis >= 0) {
          // Already have one
          throw new Error("Multiple :: in address");
        }
        ellipsis = zoneIndex;
        s = s.substring(1);
        if (s.length === 0) {
          // Can be at end
          break;
        }
      }
    }

    // Must have used entire string.
    if (s.length !== 0) {
      throw new Error("Trailing garbage after address");
    }

    // If didn't parse enough, expand ellipsis.
    if (zoneIndex < 16) {
      if (ellipsis < 0) {
        throw new Error("Address string too short");
      }
      const n = 16 - zoneIndex;
      for (let j = zoneIndex - 1; j >= ellipsis; j--) {
        ip[j + n] = ip[j];
      }
      for (let j = ellipsis; j < ellipsis + n; j++) {
        ip[j] = 0;
      }
    } else if (ellipsis >= 0) {
      // Ellipsis must represent at least one 0 group.
      throw new Error("The :: must expand to at least one field of zeros");
    }
    return new Address(ip, zone);
  }

  /**
   * Parses the IPv4 fields in an IPv6 address.
   * @param s - The string containing the IPv4 address.
   * @param ip - The Uint8Array to fill with the parsed IPv4 bytes.
   */
  private static parseIPv4Fields(s: string, ip: Uint8Array): void {
    const parts = s.split(".");
    if (parts.length !== 4) {
      throw new Error("Invalid IPv4 address");
    }
    for (let i = 0; i < 4; i++) {
      const part = parts[i];
      if (part.length === 0) {
        throw new Error("Empty octet in IPv4 address");
      }
      if (part.length > 1 && part.charAt(0) === "0") {
        // Leading zeroes are not allowed (to avoid octal interpretation)
        throw new Error("Invalid octet in IPv4 address");
      }
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error("Invalid octet in IPv4 address");
      }
      ip[i] = num;
    }
  }
}

/**
 * Represents an IP address prefix (CIDR), representing an IP network.
 */
export class AddressPrefix {
  /**
   * The IP address component.
   */
  private address: Address;

  /**
   * The prefix length in bits.
   * Range: [0, 32] for IPv4, [0, 128] for IPv6.
   */
  private bits: number;

  /**
   * Creates an instance of Prefix.
   * @param address - The Address instance.
   * @param bits - The prefix length in bits.
   */
  constructor(address: Address, bits: number) {
    this.address = address;
    this.bits = bits;

    if (bits < 0 || bits > address.bitLength()) {
      this.bits = -1; // Invalid prefix length
    }
  }

  // Static Methods

  /**
   * Parses a string as a Prefix.
   * The string must be in the form "192.168.1.0/24" or "2001:db8::/32".
   * IPv6 zones are not permitted in prefixes.
   * @param input - The string to parse.
   * @returns A new Prefix instance.
   */
  static parsePrefix(input: string): AddressPrefix {
    const [ipPart, bitsPart] = input.split("/");

    if (!bitsPart) {
      throw new Error(`Invalid prefix format: ${input}`);
    }

    const address = Address.parseAddress(ipPart);

    if (address.getZone()) {
      throw new Error("IPv6 zones are not permitted in prefixes.");
    }

    const bits = parseInt(bitsPart, 10);
    if (isNaN(bits) || bits < 0 || bits > address.bitLength()) {
      throw new Error(`Invalid prefix length: ${bitsPart}`);
    }

    return new AddressPrefix(address, bits);
  }

  /**
   * Parses a string as a Prefix and throws an error if parsing fails.
   * Intended for use in tests with hard-coded strings.
   * @param input - The string to parse.
   * @returns A new Prefix instance.
   */
  static mustParsePrefix(input: string): AddressPrefix {
    try {
      return AddressPrefix.parsePrefix(input);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse prefix: ${error.message}`);
      } else {
        throw new Error("Failed to parse prefix: An unknown error occurred.");
      }
    }
  }

  /**
   * Creates a Prefix from the provided IP address and bit prefix length.
   * Unlike Address.prefix(bits), this method does not mask off the host bits of the address.
   * @param address - The Address instance.
   * @param bits - The prefix length in bits.
   * @returns A new Prefix instance.
   */
  static from(address: Address, bits: number): AddressPrefix {
    return new AddressPrefix(address, bits);
  }

  // Instance Methods

  /**
   * Returns the IP address component.
   * @returns The Address instance.
   */
  getAddress(): Address {
    return this.address;
  }

  /**
   * Returns the prefix length in bits.
   * Returns -1 if the prefix is invalid.
   * @returns The prefix length.
   */
  getBits(): number {
    return this.bits;
  }

  /**
   * Appends a text encoding of the Prefix to a buffer.
   * @param buffer - The buffer to append to.
   * @returns The extended buffer.
   */
  appendTo(buffer: Uint8Array): Uint8Array {
    const textBytes = this.marshalText();
    const newBuffer = new Uint8Array(buffer.length + textBytes.length);
    newBuffer.set(buffer);
    newBuffer.set(textBytes, buffer.length);
    return newBuffer;
  }

  /**
   * Checks if the Prefix contains the given IP address.
   * An IPv4 address will not match an IPv6 prefix and vice versa.
   * @param ip - The Address to check.
   * @returns True if the prefix contains the IP, false otherwise.
   */
  contains(ip: Address): boolean {
    if (!this.isValid() || !ip.isValid()) {
      return false;
    }

    if (this.address.bitLength() !== ip.bitLength()) {
      return false;
    }

    const prefixBytes = this.address.toByteArray();
    const ipBytes = ip.toByteArray();
    const bitsToCheck = this.bits;

    for (let i = 0; i < bitsToCheck; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      const mask = 1 << bitIndex;
      if ((prefixBytes[byteIndex] & mask) !== (ipBytes[byteIndex] & mask)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if the Prefix represents exactly one IP address.
   * @returns True if the prefix contains exactly one IP, false otherwise.
   */
  isSingleIP(): boolean {
    if (!this.isValid()) {
      return false;
    }
    return this.bits === this.address.bitLength();
  }

  /**
   * Checks if the Prefix is valid.
   * A Prefix is valid if its bits are within the valid range for the address.
   * @returns True if valid, false otherwise.
   */
  isValid(): boolean {
    if (!this.address.isValid()) {
      return false;
    }
    const maxBits = this.address.bitLength();
    return this.bits >= 0 && this.bits <= maxBits;
  }

  /**
   * Serializes the Prefix into a binary format.
   * It returns the binary representation of the IP address with an additional byte containing the prefix bits.
   * @returns A Uint8Array containing the serialized Prefix.
   */
  marshalBinary(): Uint8Array {
    if (!this.isValid()) {
      throw new Error("Invalid Prefix cannot be marshaled.");
    }
    const ipBytes = this.address.marshalBinary();
    const bitsByte = new Uint8Array([this.bits]);
    const result = new Uint8Array(ipBytes.length + 1);
    result.set(ipBytes);
    result.set(bitsByte, ipBytes.length);
    return result;
  }

  /**
   * Serializes the Prefix into a textual format.
   * The encoding is the same as returned by toString(), with one exception: if the Prefix is invalid, the encoding is the empty string.
   * @returns A Uint8Array containing the serialized Prefix.
   */
  marshalText(): Uint8Array {
    if (!this.isValid()) {
      return new Uint8Array();
    }
    const textEncoder = new TextEncoder();
    return textEncoder.encode(this.toString());
  }

  /**
   * Deserializes a binary-encoded Prefix.
   * Expects data in the form generated by marshalBinary().
   * @param buffer - The binary data to deserialize.
   */
  unmarshalBinary(buffer: Uint8Array): void {
    if (buffer.length < 5) {
      throw new Error("Invalid binary data for Prefix.");
    }
    const bits = buffer[buffer.length - 1];
    const ipBytes = buffer.slice(0, buffer.length - 1);
    const address = new Address(new Uint8Array());
    address.unmarshalBinary(ipBytes);
    this.address = address;
    this.bits = bits;

    if (!this.isValid()) {
      throw new Error("Invalid Prefix data.");
    }
  }

  /**
   * Deserializes a text-encoded Prefix.
   * Expects data in the form generated by marshalText() or accepted by parsePrefix().
   * @param text - The textual data to deserialize.
   */
  unmarshalText(text: string): void {
    const prefix = AddressPrefix.parsePrefix(text);
    this.address = prefix.address;
    this.bits = prefix.bits;
  }

  /**
   * Returns the Prefix in its canonical form, with all but the high bits masked off.
   * @returns A new Prefix instance in canonical form.
   */
  masked(): AddressPrefix {
    if (!this.isValid()) {
      return new AddressPrefix(new Address(new Uint8Array()), -1);
    }

    const maskedAddress = this.address.mask(this.bits);
    return new AddressPrefix(maskedAddress, this.bits);
  }

  /**
   * Checks if this Prefix overlaps with another Prefix.
   * Returns true if there are any IP addresses common to both prefixes.
   * @param other - The other Prefix to compare.
   * @returns True if prefixes overlap, false otherwise.
   */
  overlaps(other: AddressPrefix): boolean {
    if (!this.isValid() || !other.isValid()) {
      return false;
    }

    if (this.address.bitLength() !== other.address.bitLength()) {
      return false;
    }

    const minBits = Math.min(this.bits, other.bits);
    const thisMasked = this.address.mask(minBits);
    const otherMasked = other.address.mask(minBits);

    return thisMasked.compare(otherMasked) === 0;
  }

  /**
   * Converts the Prefix to its CIDR notation string representation.
   * For example: "192.168.1.0/24" or "2001:db8::/32".
   * @returns The CIDR notation string.
   */
  toString(): string {
    if (!this.isValid()) {
      return "";
    }
    return `${this.address.toString()}/${this.bits}`;
  }

  /**
   * Calculates the range of IP addresses within the CIDR prefix.
   *
   * The range includes the first address (network address) and the last address
   * (broadcast address for IPv4 or the equivalent for IPv6). It computes this range
   * by applying the prefix mask to the starting address and then calculating
   * the maximum possible value for the host portion of the address.
   *
   * @returns {Object} An object containing the range of IP addresses:
   * - `from`: The first address in the range (network address).
   * - `to`: The last address in the range.
   * @throws {Error} If the prefix is invalid.
   */
  getRanges(): { from: string; to: string } {
    if (!this.isValid()) {
      throw new Error("Invalid AddressPrefix. Cannot compute range.");
    }

    const totalBits = this.address.bitLength();
    const maskedAddress = this.address.mask(this.bits);
    const startAddress = maskedAddress;

    const remainingBits = totalBits - this.bits;
    const maxHostValue = (1n << BigInt(remainingBits)) - 1n;

    // Convert maskedAddress to BigInt
    const addressBytes = maskedAddress.toByteArray();
    let addressValue = BigInt(0);
    for (let i = 0; i < addressBytes.length; i++) {
      addressValue = (addressValue << 8n) | BigInt(addressBytes[i]);
    }

    // Compute end address value
    const endAddressValue = addressValue + maxHostValue;

    // Convert endAddressValue back to bytes
    const endBytes = new Uint8Array(addressBytes.length);
    let value = endAddressValue;
    for (let i = endBytes.length - 1; i >= 0; i--) {
      endBytes[i] = Number(value & 0xffn);
      value = value >> 8n;
    }

    const endAddress = new Address(endBytes, this.address.getZone());

    return {
      from: startAddress.toString(),
      to: endAddress.toString(),
    };
  }
}

/**
 * Represents an IP address and a port number.
 */
export class AddressPort {
  /**
   * The IP address component.
   */
  private ip: Address;

  /**
   * The port number component.
   */
  private port: number;

  /**
   * Creates an instance of AddrPort.
   * @param ip - The Address instance.
   * @param port - The port number.
   */
  constructor(ip: Address, port: number) {
    this.ip = ip;
    this.port = port;
  }

  // Static Methods

  /**
   * Creates an AddrPort instance from the provided IP address and port.
   * It does not allocate additional memory.
   * @param ip - The Address instance.
   * @param port - The port number.
   * @returns A new AddrPort instance.
   */
  static from(ip: Address, port: number): AddressPort {
    return new AddressPort(ip, port);
  }

  /**
   * Parses a string as an AddrPort.
   * The string must be in the format "IP:port" or "[IPv6]:port".
   * It doesn't perform any name resolution; both the address and the port must be numeric.
   * @param input - The string to parse.
   * @returns An AddrPort instance.
   */
  static parseAddrPort(input: string): AddressPort {
    if (!input.includes(":")) {
      throw new Error(`Invalid AddrPort format: ${input}`);
    }

    let ipPart = "";
    let portPart = "";

    // IPv6 (must have brackets)
    if (input.startsWith("[")) {
      const closingBracketIndex = input.indexOf("]");
      if (closingBracketIndex === -1) {
        throw new Error(`Invalid AddrPort format: ${input}`);
      }
      ipPart = input.substring(1, closingBracketIndex);
      portPart = input.substring(closingBracketIndex + 2);
    } else {
      // IPv4 or invalid IPv6 without brackets
      const colonCount = (input.match(/:/g) || []).length;

      if (colonCount > 1) {
        throw new Error(`Invalid AddrPort format: ${input}`);
      }

      const lastColonIndex = input.lastIndexOf(":");
      ipPart = input.substring(0, lastColonIndex);
      portPart = input.substring(lastColonIndex + 1);
    }

    const ip = Address.parseAddress(ipPart);
    const port = parseInt(portPart, 10);

    if (isNaN(port) || port < 0 || port > 65535) {
      throw new Error(`Invalid port number: ${portPart}`);
    }

    return new AddressPort(ip, port);
  }

  /**
   * Parses a string as an AddrPort and throws an error if parsing fails.
   * Intended for use in tests with hard-coded strings.
   * @param input - The string to parse.
   * @returns A new AddrPort instance.
   */
  static mustParseAddrPort(input: string): AddressPort {
    try {
      return AddressPort.parseAddrPort(input);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse AddrPort: ${error.message}`);
      } else {
        throw new Error("Failed to parse AddrPort: An unknown error occurred.");
      }
    }
  }

  // Instance Methods

  /**
   * Returns the IP address component.
   * @returns The Address instance.
   */
  getAddress(): Address {
    return this.ip;
  }

  /**
   * Returns the port number component.
   * @returns The port number.
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Appends a text encoding of the AddrPort to a buffer.
   * @param buffer - The buffer to append to.
   * @returns The extended buffer.
   */
  appendTo(buffer: Uint8Array): Uint8Array {
    const textEncoder = new TextEncoder();
    const textBytes = textEncoder.encode(this.toString());
    const newBuffer = new Uint8Array(buffer.length + textBytes.length);
    newBuffer.set(buffer);
    newBuffer.set(textBytes, buffer.length);
    return newBuffer;
  }

  /**
   * Compares this AddrPort with another AddrPort.
   * @param other - The other AddrPort to compare.
   * @returns 0 if equal, -1 if less, +1 if greater.
   */
  compare(other: AddressPort): number {
    const ipComparison = this.ip.compare(other.ip);
    if (ipComparison !== 0) {
      return ipComparison;
    }
    if (this.port < other.port) {
      return -1;
    } else if (this.port > other.port) {
      return 1;
    } else {
      return 0;
    }
  }

  /**
   * Checks if the AddrPort is valid.
   * An AddrPort is valid if its IP address is valid. All ports are valid, including zero.
   * @returns True if valid, false otherwise.
   */
  isValid(): boolean {
    return this.ip.isValid();
  }

  /**
   * Serializes the AddrPort into a binary format.
   * It returns the binary representation of the IP address with two additional bytes containing the port in little-endian.
   * @returns A Uint8Array containing the serialized AddrPort.
   */
  marshalBinary(): Uint8Array {
    const ipBytes = this.ip.marshalBinary();
    const portBytes = new Uint8Array(2);
    portBytes[0] = this.port & 0xff;
    portBytes[1] = (this.port >> 8) & 0xff;
    const result = new Uint8Array(ipBytes.length + 2);
    result.set(ipBytes);
    result.set(portBytes, ipBytes.length);
    return result;
  }

  /**
   * Serializes the AddrPort into a textual format.
   * The encoding is the same as returned by AddrPort.toString(), with one exception: if the IP address is invalid, the encoding is the empty string.
   * @returns A Uint8Array containing the serialized AddrPort.
   */
  marshalText(): Uint8Array {
    if (!this.isValid()) {
      return new Uint8Array();
    }
    const textEncoder = new TextEncoder();
    return textEncoder.encode(this.toString());
  }

  /**
   * Deserializes a binary-encoded AddrPort.
   * Expects data in the form generated by marshalBinary().
   * @param buffer - The binary data to deserialize.
   */
  unmarshalBinary(buffer: Uint8Array): void {
    if (buffer.length < 2) {
      throw new Error("Invalid binary data for AddrPort.");
    }
    const portBytes = buffer.slice(buffer.length - 2);
    this.port = (portBytes[1] << 8) | portBytes[0];
    const ipBytes = buffer.slice(0, buffer.length - 2);
    const ip = new Address(new Uint8Array());
    ip.unmarshalBinary(ipBytes);
    this.ip = ip;
  }

  /**
   * Deserializes a text-encoded AddrPort.
   * Expects data in the form generated by marshalText() or accepted by parseAddrPort().
   * @param text - The textual data to deserialize.
   */
  unmarshalText(text: string): void {
    const addrPort = AddressPort.parseAddrPort(text);
    this.ip = addrPort.ip;
    this.port = addrPort.port;
  }

  /**
   * Converts the AddrPort to its string representation.
   * For IPv6 addresses, the IP is enclosed in brackets. For example, "[::1]:80".
   * @returns The string representation.
   */
  toString(): string {
    if (!this.isValid()) {
      return "";
    }
    const ipStr = this.ip.toString();
    if (this.ip.isIPv6() && !this.ip.isIPv4MappedIPv6()) {
      return `[${ipStr}]:${this.port}`;
    } else {
      return `${ipStr}:${this.port}`;
    }
  }
}
