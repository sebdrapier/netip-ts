// Generates test/golden.json from Go's net/netip, the reference implementation.
// Run: go run ./test/golden > test/golden.json
package main

import (
	"encoding/hex"
	"encoding/json"
	"net/netip"
	"os"
)

var addrs = []string{
	"", "%eth0", "0.0.0.0", "127.0.0.1", "8.8.8.8", "10.1.2.3", "172.16.0.1", "172.32.0.1",
	"192.168.0.1", "169.254.1.1", "224.0.0.251", "239.1.1.1", "255.255.255.255",
	"255.255.255.256", "192.168.0.01", "01.2.3.4", "1.2.3", "1.2.3.4.", ".1.2.3", "1..2.3",
	"1.2.3.4%eth0", "1.2.3.+4", "1.2.3.0x4", " 1.2.3.4",
	"::", "::1", "1::", "::%eth0", "1:2:3:4:5:6:7:8", "1:0:0:2::3", "1:0:0:2:0:0:0:3",
	"2001:db8::1", "2001:DB8::1", "2001:0db8:0000:0000:0000:0000:0000:0001", "2001:db8:0:1:1:1:1:1",
	"fe80::1%eth0", "fe80::1%", "fe80::1%eth0%1", "ff01::1", "ff02::1", "ff02::2", "ff05::1",
	"fc00::1", "fd12::1", "fe00::1", "fec0::1",
	"::ffff:1.2.3.4", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:0.0.0.0", "::ffff:224.0.0.1",
	"::ffff:1.2.3.4%eth0", "::1.2.3.4", "1:2:3:4:5:6:1.2.3.4", "1:2:3:4:5:6:7:1.2.3.4",
	"1:2:3:4:5:1.2.3.4", "::ffff:01.2.3.4", "::ffff:1.2.3", "::ffff:a.2.3.4",
	"1:2:3:4:5:6:7:8:9", "1:2:3:4:5:6:7", "1:2:3:4:5:6:7:8::", "::1:2:3:4:5:6:7:8",
	"1::2::3", ":1::", "1:::2", "12345::", "1:2:3:4:5:6:7:", "g::", "::ffff:ffff:ffff",
	"ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", "0:0:0:0:0:0:0:0",
}

var prefixes = []string{
	"0.0.0.0/0", "192.168.1.0/24", "192.168.1.42/24", "10.0.0.0/8", "1.2.3.4/32", "1.2.3.4/33",
	"1.2.3.4/024", "1.2.3.4/+8", "1.2.3.4/", "1.2.3.4", "1.2.3.4/-1", "1.2.3.4/0x8", "1.2.3.4/8/8",
	"::/0", "2001:db8::/32", "2001:db8::1/64", "2001:db8::1/128", "2001:db8::1/129",
	"fe80::1%eth0/64", "::ffff:1.2.3.4/120", "::ffff:1.2.3.4/96", "192.168.1.0/17",
}

var probes = []string{"192.168.1.1", "10.9.9.9", "1.2.3.4", "2001:db8::5", "::ffff:1.2.3.4", "fe80::1%eth0", "8.8.8.8"}

var addrPorts = []string{
	"1.2.3.4:80", "1.2.3.4:0", "1.2.3.4:65535", "1.2.3.4:65536", "1.2.3.4:080", "1.2.3.4:", "1.2.3.4",
	":80", "1.2.3.4:-1", "1.2.3.4:+1", "[::1]:80", "[::1]80", "[::1:80", "::1:80", "[1.2.3.4]:80",
	"[fe80::1%eth0]:443", "[::ffff:1.2.3.4]:80", "[]:80", "1.2.3.4:http",
}

type addrOut struct {
	In                                                        string
	Ok                                                        bool
	String, Expanded, Zone, Next, Prev, Binary, JSON          string `json:",omitempty"`
	Is4, Is6, Is4In6, Loopback, Multicast, IfaceLocalMC, LLMC bool
	LLUnicast, Private, Unspecified, GlobalUnicast            bool
	BitLen                                                    int
}

type prefixOut struct {
	In                           string
	Ok                           bool
	String, Masked, Binary, Addr string `json:",omitempty"`
	Bits                         int
	SingleIP                     bool
	Contains                     []bool
	Overlaps                     []bool
}

type addrPortOut struct {
	In                   string
	Ok                   bool
	String, Binary, Addr string `json:",omitempty"`
	Port                 int
}

func main() {
	var out struct {
		Probes    []string
		Addrs     []addrOut
		Prefixes  []prefixOut
		AddrPorts []addrPortOut
	}
	out.Probes = probes
	for _, s := range addrs {
		a, err := netip.ParseAddr(s)
		o := addrOut{In: s, Ok: err == nil}
		if err == nil {
			b, _ := a.MarshalBinary()
			j, _ := a.MarshalText()
			o.String, o.Expanded, o.Zone, o.Binary, o.JSON = a.String(), a.StringExpanded(), a.Zone(), hex.EncodeToString(b), string(j)
			o.Next, o.Prev = a.Next().String(), a.Prev().String()
			o.Is4, o.Is6, o.Is4In6, o.BitLen = a.Is4(), a.Is6(), a.Is4In6(), a.BitLen()
			o.Loopback, o.Multicast, o.IfaceLocalMC, o.LLMC = a.IsLoopback(), a.IsMulticast(), a.IsInterfaceLocalMulticast(), a.IsLinkLocalMulticast()
			o.LLUnicast, o.Private, o.Unspecified, o.GlobalUnicast = a.IsLinkLocalUnicast(), a.IsPrivate(), a.IsUnspecified(), a.IsGlobalUnicast()
		}
		out.Addrs = append(out.Addrs, o)
	}
	var parsed []netip.Prefix
	for _, s := range prefixes {
		p, err := netip.ParsePrefix(s)
		parsed = append(parsed, p)
		o := prefixOut{In: s, Ok: err == nil}
		if err == nil {
			b, _ := p.MarshalBinary()
			o.String, o.Masked, o.Binary, o.Addr = p.String(), p.Masked().String(), hex.EncodeToString(b), p.Addr().String()
			o.Bits, o.SingleIP = p.Bits(), p.IsSingleIP()
			for _, s := range probes {
				o.Contains = append(o.Contains, p.Contains(netip.MustParseAddr(s)))
			}
		}
		out.Prefixes = append(out.Prefixes, o)
	}
	for i := range out.Prefixes {
		for _, q := range parsed {
			out.Prefixes[i].Overlaps = append(out.Prefixes[i].Overlaps, parsed[i].Overlaps(q))
		}
	}
	for _, s := range addrPorts {
		ap, err := netip.ParseAddrPort(s)
		o := addrPortOut{In: s, Ok: err == nil}
		if err == nil {
			b, _ := ap.MarshalBinary()
			o.String, o.Binary, o.Addr, o.Port = ap.String(), hex.EncodeToString(b), ap.Addr().String(), int(ap.Port())
		}
		out.AddrPorts = append(out.AddrPorts, o)
	}
	e := json.NewEncoder(os.Stdout)
	e.SetIndent("", " ")
	e.Encode(out)
}
