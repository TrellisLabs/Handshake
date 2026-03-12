// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev A test ERC20 token that mimics USDC (6 decimals).
 * Anyone can mint tokens for testing purposes.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Mint tokens to the caller. Anyone can mint for testing.
     * @param amount The amount to mint (remember: 6 decimals)
     */
    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /**
     * @dev Mint tokens to a specific address. For setting up test scenarios.
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mintTo(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
