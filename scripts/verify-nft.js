await hre.run("verify:verify", {
  address: "0x86A67FbeF2B7aC71acDD763d73Ae7146D45c5832",
  constructorArguments: [
    "0x1d28456F4b846dc625f30C820a58Da60e08B7760",
    "https://baseurl.com/",
    "https://revealurl.com/",
    "0x2baa455e573df4019b11859231dd9e425d885293",
    "1000000000000000000",
    "10000000000000000000"
  ],
});