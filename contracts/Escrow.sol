//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/* 
-> seller lists his property(seller is an actor)
-> buyer deposits down payment(buyer is an actor)
-> appraisal(appraiser is an actor)
-> inspection(inspector is an actor)
-> lender approves(lender is an actor)
-> lender funds
-> transfer of ownership
-> seller gets paid
*/

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    address payable public seller;
    address public appraiser;
    address public inspector;
    address public lender;
    address public nft_address;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrices;
    mapping(uint256 => uint256) public escrowAmounts;
    mapping(uint256 => address) public buyers;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(
            msg.sender == buyers[_nftID],
            "Only listed buyer of the property can call this function"
        );
        _;
    }

    modifier onlyInspector() {
        require(
            msg.sender == inspector,
            "Only the inspector can call this function"
        );
        _;
    }

    constructor(
        address _nft_address,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nft_address = _nft_address;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    //transfer ownership to escrow from seller
    function list(
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address _buyer
    ) public payable onlySeller {
        IERC721(nft_address).transferFrom(msg.sender, address(this), _nftID);
        isListed[_nftID] = true;
        purchasePrices[_nftID] = _purchasePrice;
        escrowAmounts[_nftID] = _escrowAmount;
        buyers[_nftID] = _buyer;
    }

    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(
            msg.value >= escrowAmounts[_nftID],
            "Amount sent is not enough"
        );
    }

    // all necessary parties(buyer, seller, lender) will need to approve the sale
    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    // this function should check whether the nft is listed, if llisted is the earnest money deposited?
    function updateInspectionStatus(
        uint256 _nftID,
        bool _passed
    ) public onlyInspector {
        inspectionPassed[_nftID] = _passed;
    }

    function finalizedSale(uint256 _nftID) public {
        require(isListed[_nftID] = true);
        require(inspectionPassed[_nftID] = true);
        require(approval[_nftID][buyers[_nftID]] = true);
        require(approval[_nftID][seller] = true);
        require(approval[_nftID][lender] = true);
        require(address(this).balance >= purchasePrices[_nftID]);

        isListed[_nftID] = false;

        (bool success, ) = payable(seller).call{value: purchasePrices[_nftID]}(
            ""
        );
        require(success, "Money could not be transferred to seller");

        IERC721(nft_address).transferFrom(
            address(this),
            buyers[_nftID],
            _nftID
        );
    }

    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false) {
            payable(buyers[_nftID]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
    }

    ///////////////
    // getters ////
    ///////////////

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getPurchasePrice(uint256 _nftID) public view returns (uint256) {
        return purchasePrices[_nftID];
    }

    receive() external payable {}
}
