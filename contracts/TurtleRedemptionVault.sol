// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "erc721a/contracts/IERC721A.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TurtleRedemptionVault is IERC721Receiver, Ownable, ReentrancyGuard {
    IERC721A public constant NFT_CONTRACT = IERC721A(0x5848335Bbd8e10725F5A35d97A8e252eFdA9Be1a);
    IERC20 public constant TURTLE_TOKEN = IERC20(0x2bAA455e573df4019B11859231Dd9e425D885293); 
    uint256 public constant TOTAL_NFT_SUPPLY = 10625;
    uint256 public swapFeeTurtle = 100 * 1e18; // 100 TURTLE default
    uint256 public purchaseFeeCRO = 10 * 1e18; // 10 CRO default

    uint256[] public vaultNFTs;
    mapping(uint256 => uint256) public nftToIndex;

    constructor() Ownable(0xea634Da88a37f60a8A64156b3997f3C3389fd91F) {}

    event NFTDepositedBatch(address indexed user, uint256[] tokenIds, uint256 turtlePaid);
    event NFTSwapped(address indexed user, uint256[] tokenIds, uint256 turtlePaid, uint256 feeCollected);
    event NFTPurchasedWithCRO(address indexed user, uint256[] tokenIds, uint256 croPaid);
    event SwapFeeTurtleChanged(uint256 oldFee, uint256 newFee);
    event PurchaseFeeCROChanged(uint256 oldFee, uint256 newFee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event CROWithdrawn(address indexed owner, uint256 amount);



    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function turtlePoolBalance() public view returns (uint256) {
        return TURTLE_TOKEN.balanceOf(address(this));
    }

    function turtlePerNFT() public view returns (uint256) {
        return TURTLE_TOKEN.balanceOf(address(this)) / TOTAL_NFT_SUPPLY;
    }

    function vaultNFTCount() public view returns (uint256) {
        return vaultNFTs.length;
    }

    function getVaultNFTs() external view returns (uint256[] memory) {
        return vaultNFTs;
    }

    function depositByIds(uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0 && n <= 20, "Invalid amount: 1-20 NFTs only");

        uint256 perNFT = turtlePerNFT();
        require(perNFT > 0, "Pool empty");

        uint256 totalPay = perNFT * n;

        for (uint256 i = 0; i < n; i++) {
            NFT_CONTRACT.safeTransferFrom(msg.sender, address(this), tokenIds[i]);
            nftToIndex[tokenIds[i]] = vaultNFTs.length;
            vaultNFTs.push(tokenIds[i]);
        }

        bool ok = TURTLE_TOKEN.transfer(msg.sender, totalPay);
        require(ok, "Turtle transfer failed");

        emit NFTDepositedBatch(msg.sender, tokenIds, totalPay);
    }

    function swapForNFTs(uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0 && n <= 20, "Invalid amount: 1-20 NFTs only");

        uint256 perNFT = turtlePerNFT();
        require(perNFT > 0, "Pool empty");

        uint256 costPer = perNFT + swapFeeTurtle;
        uint256 totalCost = costPer * n;

        for (uint256 i = 0; i < n; i++) {
            require(nftToIndex[tokenIds[i]] < vaultNFTs.length && vaultNFTs[nftToIndex[tokenIds[i]]] == tokenIds[i], "NFT not in vault");
        }

        bool ok = TURTLE_TOKEN.transferFrom(msg.sender, address(this), totalCost);
        require(ok, "Turtle transfer failed");

        for (uint256 i = 0; i < n; i++) {
            _removeNFTFromVault(tokenIds[i]);
            NFT_CONTRACT.safeTransferFrom(address(this), msg.sender, tokenIds[i]);
        }

        emit NFTSwapped(msg.sender, tokenIds, totalCost - (perNFT * n), swapFeeTurtle * n);
    }

    function purchaseNFTsWithCRO(uint256[] calldata tokenIds) external payable nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0 && n <= 20, "Invalid amount: 1-20 NFTs only");

        uint256 totalPrice = purchaseFeeCRO * n;
        require(msg.value >= totalPrice, "Insufficient CRO");

        for (uint256 i = 0; i < n; i++) {
            require(nftToIndex[tokenIds[i]] < vaultNFTs.length && vaultNFTs[nftToIndex[tokenIds[i]]] == tokenIds[i], "NFT not in vault");
        }

        for (uint256 i = 0; i < n; i++) {
            _removeNFTFromVault(tokenIds[i]);
            NFT_CONTRACT.safeTransferFrom(address(this), msg.sender, tokenIds[i]);
        }

        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit NFTPurchasedWithCRO(msg.sender, tokenIds, totalPrice);
    }

    function setSwapFeeTurtle(uint256 _newFee) external onlyOwner {
        emit SwapFeeTurtleChanged(swapFeeTurtle, _newFee);
        swapFeeTurtle = _newFee;
    }

    function setPurchaseFeeCRO(uint256 _newFee) external onlyOwner {
        emit PurchaseFeeCROChanged(purchaseFeeCRO, _newFee);
        purchaseFeeCRO = _newFee;
    }

    function withdrawCRO(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient CRO");
        payable(owner()).transfer(amount);
        emit CROWithdrawn(owner(), amount);
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "Zero address");
        super.transferOwnership(newOwner);
    }

    function _removeNFTFromVault(uint256 tokenId) private {
        uint256 index = nftToIndex[tokenId];
        uint256 lastIndex = vaultNFTs.length - 1;
        
        if (index != lastIndex) {
            uint256 lastTokenId = vaultNFTs[lastIndex];
            vaultNFTs[index] = lastTokenId;
            nftToIndex[lastTokenId] = index;
        }
        
        vaultNFTs.pop();
        delete nftToIndex[tokenId];
    }

    receive() external payable {}
    fallback() external payable {}
}
