// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFT is ERC721, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable {
    uint256 public constant MAX_SUPPLY = 10625;
    uint256 private _nextTokenId;
    string public baseTokenURI;
    uint256 public nativeTokenFee;
    uint256 public erc20TokenFee;
    IERC20 public erc20Token;

    constructor(address initialOwner, string memory baseURI, address erc20TokenAddress, uint256 _nativeTokenFee, uint256 _erc20TokenFee)
        ERC721("NFT", "nft")
        Ownable(initialOwner)
    {
        baseTokenURI = baseURI;
        erc20Token = IERC20(erc20TokenAddress);
        nativeTokenFee = _nativeTokenFee;
        erc20TokenFee = _erc20TokenFee;
    }

    // Admin mint function
    function adminMint(address to, uint256 _amount) public onlyOwner {
        require(_amount <= 20, "Cannot mint more than 20 tokens at a time");
        require(_nextTokenId + _amount <= MAX_SUPPLY, "Max supply reached");
        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
        }
    }

    // Public mint function with native token
    function publicMintWithNativeToken(uint256 _amount) public payable {
        require(_amount <= 20, "Cannot mint more than 20 tokens at a time");
        require(_nextTokenId + _amount <= MAX_SUPPLY, "Max supply reached");
        require(msg.value >= nativeTokenFee * _amount, "Insufficient native token fee");
        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }
    }

        // Public mint function with ERC20 token
    function publicMintWithERC20Token(uint256 _amount) public {
        require(_amount <= 20, "Cannot mint more than 20 tokens at a time");
        require(_nextTokenId + _amount <= MAX_SUPPLY, "Max supply reached");
        require(erc20Token.transferFrom(msg.sender, address(this), erc20TokenFee * _amount), "Insufficient ERC20 token fee");
        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }
    }

    // Admin utilities
    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://baseurl.com/";
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setNativeTokenFee(uint256 _nativeTokenFee) public onlyOwner {
        nativeTokenFee = _nativeTokenFee;
    }

    function setERC20TokenFee(uint256 _erc20TokenFee) public onlyOwner {
        erc20TokenFee = _erc20TokenFee;
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
