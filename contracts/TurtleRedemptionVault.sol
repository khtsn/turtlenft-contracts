// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "erc721a/contracts/IERC721A.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TurtleRedemptionVault is IERC721Receiver, Ownable, ReentrancyGuard {
    IERC721A public immutable NFT_CONTRACT;
    IERC20 public immutable TURTLE_TOKEN;
    uint256 public constant TOTAL_NFT_SUPPLY = 10625;
    uint256 public constant MAX_BATCH_SIZE = 20;
    uint256 public swapFeeTurtle = 35000 * 1e18; // 35k TURTLE default
    uint256 public purchaseFeeCRO = 288 * 1e18; // 10 CRO default

    uint256[] public vaultNFTs;
    mapping(uint256 => uint256) public nftToIndex;
    mapping(uint256 => bool) private _processedTokens;

    constructor(address _nftContract, address _turtleToken, address _owner) Ownable(_owner) {
        NFT_CONTRACT = IERC721A(_nftContract);
        TURTLE_TOKEN = IERC20(_turtleToken);
    }

    event NFTDepositedBatch(address indexed user, uint256[] tokenIds, uint256 turtlePaid);
    event NFTSwapped(address indexed user, uint256[] userTokenIds, uint256[] vaultTokenIds, uint256 turtlePaid, uint256 feeCollected);
    event NFTPurchasedWithCRO(address indexed user, uint256[] tokenIds, uint256 croPaid);
    event SwapFeeTurtleChanged(uint256 oldFee, uint256 newFee);
    event PurchaseFeeCROChanged(uint256 oldFee, uint256 newFee);
    event CROWithdrawn(address indexed owner, uint256 amount);

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function turtlePerNFT() public view returns (uint256) {
        return TURTLE_TOKEN.balanceOf(address(this)) / TOTAL_NFT_SUPPLY;
    }

    function getVaultNFTs() external view returns (uint256[] memory) {
        return vaultNFTs;
    }

    function depositByIds(uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0 && n <= MAX_BATCH_SIZE, "Invalid amount: 1-20 NFTs only");

        uint256 turtleBalance = TURTLE_TOKEN.balanceOf(address(this));
        uint256 perNFT = turtleBalance / TOTAL_NFT_SUPPLY;
        require(perNFT > 0, "Pool empty");

        // Validate all tokens first
        for (uint256 i = 0; i < n; i++) {
            require(!_processedTokens[tokenIds[i]], "Duplicate token");
            require(NFT_CONTRACT.ownerOf(tokenIds[i]) == msg.sender, "Not token owner");
            _processedTokens[tokenIds[i]] = true;
        }

        uint256 totalPay = perNFT * n;

        // Execute transfers
        for (uint256 i = 0; i < n; i++) {
            NFT_CONTRACT.safeTransferFrom(msg.sender, address(this), tokenIds[i]);
            nftToIndex[tokenIds[i]] = vaultNFTs.length;
            vaultNFTs.push(tokenIds[i]);
            _processedTokens[tokenIds[i]] = false;
        }

        bool ok = TURTLE_TOKEN.transfer(msg.sender, totalPay);
        require(ok, "Turtle transfer failed");

        emit NFTDepositedBatch(msg.sender, tokenIds, totalPay);
    }

    function swapForNFTs(uint256[] calldata userTokenIds, uint256[] calldata vaultTokenIds) external nonReentrant {
        uint256 n = userTokenIds.length;
        require(n > 0 && n <= MAX_BATCH_SIZE, "Invalid amount: 1-20 NFTs only");
        require(n == vaultTokenIds.length, "Token arrays must be same length");

        uint256 totalFee = swapFeeTurtle * n;

        // Validate user tokens
        for (uint256 i = 0; i < n; i++) {
            require(!_processedTokens[userTokenIds[i]], "Duplicate user token");
            require(NFT_CONTRACT.ownerOf(userTokenIds[i]) == msg.sender, "Not token owner");
            _processedTokens[userTokenIds[i]] = true;
        }

        // Validate vault tokens
        for (uint256 i = 0; i < n; i++) {
            require(!_processedTokens[vaultTokenIds[i]], "Duplicate vault token");
            require(nftToIndex[vaultTokenIds[i]] < vaultNFTs.length && vaultNFTs[nftToIndex[vaultTokenIds[i]]] == vaultTokenIds[i], "NFT not in vault");
            _processedTokens[vaultTokenIds[i]] = true;
        }

        bool ok = TURTLE_TOKEN.transferFrom(msg.sender, address(this), totalFee);
        require(ok, "Turtle transfer failed");

        // Execute swaps
        for (uint256 i = 0; i < n; i++) {
            NFT_CONTRACT.safeTransferFrom(msg.sender, address(this), userTokenIds[i]);
            nftToIndex[userTokenIds[i]] = vaultNFTs.length;
            vaultNFTs.push(userTokenIds[i]);
            
            _removeNFTFromVault(vaultTokenIds[i]);
            NFT_CONTRACT.safeTransferFrom(address(this), msg.sender, vaultTokenIds[i]);
            
            _processedTokens[userTokenIds[i]] = false;
            _processedTokens[vaultTokenIds[i]] = false;
        }

        emit NFTSwapped(msg.sender, userTokenIds, vaultTokenIds, totalFee, totalFee);
    }

    function purchaseNFTsWithCRO(uint256[] calldata tokenIds) external payable nonReentrant {
        uint256 n = tokenIds.length;
        require(n > 0 && n <= MAX_BATCH_SIZE, "Invalid amount: 1-20 NFTs only");

        uint256 totalPrice = purchaseFeeCRO * n;
        require(msg.value >= totalPrice, "Insufficient CRO");

        // Validate all tokens first
        for (uint256 i = 0; i < n; i++) {
            require(!_processedTokens[tokenIds[i]], "Duplicate token");
            require(nftToIndex[tokenIds[i]] < vaultNFTs.length && vaultNFTs[nftToIndex[tokenIds[i]]] == tokenIds[i], "NFT not in vault");
            _processedTokens[tokenIds[i]] = true;
        }

        // Execute transfers
        for (uint256 i = 0; i < n; i++) {
            _removeNFTFromVault(tokenIds[i]);
            NFT_CONTRACT.safeTransferFrom(address(this), msg.sender, tokenIds[i]);
            _processedTokens[tokenIds[i]] = false;
        }

        // Safe refund using call
        if (msg.value > totalPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(success, "Refund failed");
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

    function withdrawCRO() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "No CRO to withdraw");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        emit CROWithdrawn(owner(), amount);
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
