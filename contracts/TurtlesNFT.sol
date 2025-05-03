// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "erc721a/contracts/ERC721A.sol";
import "erc721a/contracts/extensions/ERC721ABurnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TurtlesNFT is ERC721A, Ownable, ERC721ABurnable {
    uint256 public constant MAX_SUPPLY = 10625;
    string public baseTokenURI;
    string public revealTokenURI;
    bool public isRevealed;
    uint256 public nativeTokenFee;
    uint256 public erc20TokenFee;
    IERC20 public erc20Token;
    uint256 public maxERC20Mints;
    uint256 private _erc20MintCount;

    constructor(address initialOwner, 
    string memory baseURI, 
    string memory _revealTokenURI, 
    address erc20TokenAddress, 
    uint256 _nativeTokenFee, 
    uint256 _erc20TokenFee,
    uint256 _maxERC20PublicMints)
        ERC721A("Turtles NFT", "Turtles")
        Ownable(initialOwner)
    {
        baseTokenURI = baseURI;
        revealTokenURI = _revealTokenURI;
        isRevealed = false;
        erc20Token = IERC20(erc20TokenAddress);
        nativeTokenFee = _nativeTokenFee;
        erc20TokenFee = _erc20TokenFee;
        maxERC20Mints = _maxERC20PublicMints;
    }

    // Admin mint function
    function adminMint(address to, uint256 quantity) public onlyOwner {
        require(totalSupply() + quantity <= MAX_SUPPLY, "Max supply reached");
        _mint(to, quantity);
    }

    // Public mint function with native token
    function publicMintWithNativeToken(uint256 quantity) public payable {
        require(totalSupply() + quantity <= MAX_SUPPLY, "Max supply reached");
        require(quantity <= 20, "Cannot mint more than 20 tokens at a time");
        require(msg.value >= nativeTokenFee * quantity, "Insufficient native token fee");
        _mint(msg.sender, quantity);
    }

    // Public mint function with ERC20 token
    function publicMintWithERC20Token(uint256 quantity) public {
        require(totalSupply() + quantity <= MAX_SUPPLY, "Max supply reached");
        require(_erc20MintCount < maxERC20Mints, "Cannot mint more with this method");
        require(quantity <= 20, "Cannot mint more than 20 tokens at a time");
        require(erc20Token.transferFrom(msg.sender, address(this), erc20TokenFee * quantity), "Insufficient ERC20 token fee");
        _mint(msg.sender, quantity);
        _erc20MintCount += quantity;
    }

    // Admin utilities
    function setBaseURI(string memory newURI) public onlyOwner {
        baseTokenURI = newURI;
    }

    function setRevealTokenURI(string memory newRevealURI) public onlyOwner {
        revealTokenURI = newRevealURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setNativeTokenFee(uint256 newFee) public onlyOwner {
        nativeTokenFee = newFee;
    }

    function setERC20TokenFee(uint256 newFee) public onlyOwner {
        erc20TokenFee = newFee;
    }

    function toggleReveal() public onlyOwner {
        isRevealed = !isRevealed;
    }

    function withdraw() external onlyOwner {
        require(payable(owner()).send(address(this).balance), "transfer failed");
    }

    function withdrawERC20() external onlyOwner {
        require(erc20Token.transfer(owner(), erc20Token.balanceOf(address(this))), "Failed to transfer ERC20 tokens");
    }

    function updateERC20MaxMints(uint256 newValue) external onlyOwner {
        maxERC20Mints = newValue;
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721A, IERC721A)
        returns (string memory)
    {
        if (!isRevealed) {
            return revealTokenURI;
        }
        return super.tokenURI(tokenId);
    }
}
