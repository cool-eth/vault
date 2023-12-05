// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @author cool-eth
/// @notice Vault contract
contract Vault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    ////////////////          EVENTS          ////////////////

    event TokenWhitelisted(address indexed token, bool whitelisted);

    event TokenDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event TokenWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    ////////////////          Errors          ////////////////

    /// @notice use custom errors to reduce the gas cost

    error TokenAlreadyWhitelisted();

    error TokenNotWhitelisted();

    error NotEnoughDeposits();

    error TokenDepositsAvailable();

    ////////////////          Storage          ////////////////

    /// @notice whitelisted tokens set
    EnumerableSet.AddressSet private _whitelistedTokens;

    /// @notice user => erc20 token => deposited amount
    mapping(address => mapping(address => uint256)) public userDeposits;

    /// @notice erc20 token => total deposited amount
    mapping(address => uint256) public totalDeposits;

    constructor() Ownable() Pausable() ReentrancyGuard() {}

    ////////////////          ADMIN FUNCTIONS          ////////////////

    /// @notice pause deposits/withdraws
    /// @dev Admin function
    function pause() external whenNotPaused onlyOwner {
        _pause();
    }

    /// @notice unpause deposits/withdraws
    /// @dev Admin function
    function unpause() external whenPaused onlyOwner {
        _unpause();
    }

    /// @notice Update whitelist settings of a token
    /// @dev Admin function
    /// @param token erc20 token address
    /// @param whitelist whitelist or not
    function whitelistToken(address token, bool whitelist) external onlyOwner {
        if (whitelist) {
            if (_whitelistedTokens.contains(token)) {
                revert TokenAlreadyWhitelisted();
            }

            _whitelistedTokens.add(token);
        } else {
            /// IDEA: I think we can check total deposit amount here, if total deposit amount for this token is not zero, then we can't remove that token from whitelist
            if (totalDeposits[token] > 0) {
                revert TokenDepositsAvailable();
            }

            if (!_whitelistedTokens.contains(token)) {
                revert TokenNotWhitelisted();
            }

            _whitelistedTokens.remove(token);
        }

        emit TokenWhitelisted(token, whitelist);
    }

    ////////////////          USER FUNCTIONS          ////////////////

    /// @notice Deposit ERC20 token
    /// @param token erc20 token address
    /// @param amount amount to deposit
    function deposit(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (!_whitelistedTokens.contains(token)) {
            revert TokenNotWhitelisted();
        }

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        amount = IERC20(token).balanceOf(address(this)) - balanceBefore; // calculate actual deposited amount

        userDeposits[msg.sender][token] += amount;
        totalDeposits[token] += amount;

        emit TokenDeposited(msg.sender, token, amount);
    }

    /// @notice Withdraw ERC20 token
    /// @param token erc20 token address
    /// @param amount amount to withdraw
    function withdraw(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (!_whitelistedTokens.contains(token)) {
            revert TokenNotWhitelisted();
        }

        if (userDeposits[msg.sender][token] < amount) {
            revert NotEnoughDeposits();
        }

        userDeposits[msg.sender][token] -= amount;
        totalDeposits[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit TokenWithdrawn(msg.sender, token, amount);
    }

    ////////////////          QUERY FUNCTIONS          ////////////////

    /// @notice Check if a token is whitelisted or not
    /// @param token erc20 token address
    /// @return whitelisted whitelisted or not
    function isWhitelistedToken(address token) external view returns (bool) {
        return _whitelistedTokens.contains(token);
    }

    /// @notice Get all whitelisted tokens array
    /// @return tokens Array of whitelisted tokens
    function allWhitelistedTokens()
        external
        view
        returns (address[] memory tokens)
    {
        uint256 length = _whitelistedTokens.length();
        tokens = new address[](length);
        for (uint256 i = 0; i < length; ) {
            tokens[i] = _whitelistedTokens.at(i);

            unchecked {
                i += 1;
            }
        }
    }
}
