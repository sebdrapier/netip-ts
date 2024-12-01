import Address from "./address";

/**
 * Represents an IP address and a port number.
 */
export default class AddressPort {
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
