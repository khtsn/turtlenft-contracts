// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC721Enumerable {
    function balanceOf(address owner) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract TurtleRedemptionVault {
    IERC721Enumerable public constant NFT_CONTRACT = IERC721Enumerable(0x5848335Bbd8e10725F5A35d97A8e252eFdA9Be1a);
    IERC20 public constant TURTLE_TOKEN = IERC20(0x2bAA455e573df4019B11859231Dd9e425D885293);
    address public constant CRO_TOKEN_PLACEHOLDER = 0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23; 
    address public owner = 0xea634Da88a37f60a8A64156b3997f3C3389fd91F;

    uint256 public constant TOTAL_NFT_SUPPLY = 10_625;
    uint256 public swapFeeTurtle = 100 * 1e18; // 100 TURTLE default
    uint256 public purchaseFeeCRO = 10 * 1e18; // 10 CRO default

    uint8 private _locked = 1;

    event NFTDeposited(address indexed user, uint256 indexed tokenId, uint256 turtlePaid);
    event NFTDepositedBatch(address indexed user, uint256[] tokenIds, uint256 turtlePaid);
    event NFTDepositedByCount(address indexed user, uint256 count, uint256 turtlePaid);
    event NFTSwapped(address indexed user, uint256 count, uint256 turtlePaid, uint256 feeCollected);
    event NFTPurchasedWithCRO(address indexed user, uint256 count, uint256 croPaid);
    event SwapFeeTurtleChanged(uint256 oldFee, uint256 newFee);
    event PurchaseFeeCROChanged(uint256 oldFee, uint256 newFee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event CROWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 1, "Reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function turtlePoolBalance() public view returns (uint256) {
        return TURTLE_TOKEN.balanceOf(address(this));
    }

    function turtlePerNFT() public view returns (uint256) {
        return TURTLE_TOKEN.balanceOf(address(this)) / TOTAL_NFT_SUPPLY;
    }

    function vaultNFTCount() public view returns (uint256) {
        return NFT_CONTRACT.balanceOf(address(this));
    }

    function depositByIds(uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0, "No tokens");

        uint256 perNFT = turtlePerNFT();
        require(perNFT > 0, "Pool empty");

        uint256 totalPay = perNFT * n;

        for (uint256 i = 0; i < n; i++) {
            NFT_CONTRACT.safeTransferFrom(msg.sender, address(this), tokenIds[i]);
        }

        bool ok = TURTLE_TOKEN.transfer(msg.sender, totalPay);
        require(ok, "Turtle transfer failed");

        emit NFTDepositedBatch(msg.sender, tokenIds, totalPay);
    }

    function depositByCount(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        require(NFT_CONTRACT.balanceOf(msg.sender) >= amount, "Not enough NFTs");

        uint256 perNFT = turtlePerNFT();
        require(perNFT > 0, "Pool empty");

        uint256 totalPay = perNFT * amount;

        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = NFT_CONTRACT.tokenOfOwnerByIndex(msg.sender, 0);
            NFT_CONTRACT.safeTransferFrom(msg.sender, address(this), tokenId);
            emit NFTDeposited(msg.sender, tokenId, perNFT);
        }

        bool ok = TURTLE_TOKEN.transfer(msg.sender, totalPay);
        require(ok, "Turtle transfer failed");

        emit NFTDepositedByCount(msg.sender, amount, totalPay);
    }

    function depositAllOwned() external nonReentrant {
        uint256 balance = NFT_CONTRACT.balanceOf(msg.sender);
        require(balance > 0, "No NFTs");

        uint256 perNFT = turtlePerNFT();
        require(perNFT > 0, "Pool empty");

        uint256 totalPay = perNFT * balance;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = NFT_CONTRACT.tokenOfOwnerByIndex(msg.sender, 0);
            NFT_CONTRACT.safeTransferFrom(msg.sender, address(this), tokenId);
            emit NFTDeposited(msg.sender, tokenId, perNFT);
        }

        bool ok = TURTLE_TOKEN.transfer(msg.sender, totalPay);
        require(ok, "Turtle transfer failed");

        emit NFTDepositedByCount(msg.sender, balance, totalPay);
    }

    function swapForNFTs(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        uint256 available = NFT_CONTRACT.balanceOf(address(this));
        require(available >= amount, "Not enough NFTs in vault");

        uint256 perNFT = turtlePerNFT();
        require(perNFT > 0, "Pool empty");

        uint256 costPer = perNFT + swapFeeTurtle;
        uint256 totalCost = costPer * amount;

        bool ok = TURTLE_TOKEN.transferFrom(msg.sender, address(this), totalCost);
        require(ok, "Turtle transfer failed");

        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = NFT_CONTRACT.tokenOfOwnerByIndex(address(this), 0);
            NFT_CONTRACT.safeTransferFrom(address(this), msg.sender, tokenId);
        }

        emit NFTSwapped(msg.sender, amount, totalCost - (perNFT * amount), swapFeeTurtle * amount);
    }

    function purchaseNFTsWithCRO(uint256 amount) external payable nonReentrant {
        require(amount > 0, "Invalid amount");
        uint256 available = NFT_CONTRACT.balanceOf(address(this));
        require(available >= amount, "Not enough NFTs in vault");

        uint256 totalPrice = purchaseFeeCRO * amount;
        require(msg.value >= totalPrice, "Insufficient CRO");

        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = NFT_CONTRACT.tokenOfOwnerByIndex(address(this), 0);
            NFT_CONTRACT.safeTransferFrom(address(this), msg.sender, tokenId);
        }

        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit NFTPurchasedWithCRO(msg.sender, amount, totalPrice);
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
        payable(owner).transfer(amount);
        emit CROWithdrawn(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    receive() external payable {}
    fallback() external payable {}
}
