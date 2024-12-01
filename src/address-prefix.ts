import Address from "./address"; // Adjust the import path as necessary

/**
 * Represents an IP address prefix (CIDR), representing an IP network.
 */
export default class AddressPrefix {
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
