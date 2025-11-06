# Self Custodial Bitcoin Wallet

A decentralized Bitcoin wallet application running entirely on the Internet Computer Protocol (ICP) without external dependencies.

## Authentication
- Internet Identity integration for passwordless, secure user authentication
- Multi-tenant architecture supporting multiple users per canister
- Automatic wallet provisioning upon first login - no manual wallet creation required

## Application Flow
- Initial splash/launch screen displayed on app load featuring both "mt mark.svg" and "mt type.svg" stacked vertically and centered
- Smooth animated transition to sign-in screen where "mt type.svg" fades out while "mt mark.svg" slides upward from its centered position on the splash screen to the top of the sign-in screen, creating a seamless and visually prominent transition between screens
- Animation must be smooth and prominent with "mt mark.svg" moving upward in a continuous motion from center to top position
- Animation timing is 50% slower than standard speed for a noticeably slower, smoother effect with all related timing and easing functions adjusted accordingly
- "mt type.svg" fades out during the transition before the login content fades in
- Animation begins after splash screen delay with polished timing and easing that matches the brand's style
- Sign-in screen with "mt mark.svg" positioned at the top, welcome text with proper formatting and line breaks, and "Sign In" button
- "Sign In" button redirects to Internet Identity authentication flow at id.ic0.app
- Complete flow: splash/launch screen → animated transition → sign-in screen → Internet Identity login → onboarding flow (for first-time users) or main wallet dashboard (for returning users)
- User onboarding state tracking to determine when to show onboarding screens after authentication

## Sign Out and Reset Feature
- Users can fully sign out and reset their onboarding/login state from the main wallet interface
- Sign out action clears all session data, authentication state, and onboarding completion status for the current session
- After sign out, users are returned to the splash screen as if they were new users
- Users must re-authenticate through Internet Identity to access the wallet again
- Clear UI element (button or menu option) available in the main wallet interface to trigger the sign out and reset
- Sign out action requires user confirmation to prevent accidental sign outs
- All wallet state and session data is cleared from the frontend upon sign out

## Onboarding Flow
- For first-time users after successful authentication, immediately display the deposit onboarding screen
- Deposit screen with "Deposit Bitcoin to fund your wallet." text vertically and horizontally centered in the main content area
- Wallet address and action buttons anchored at the bottom of the screen
- Wallet address must reliably load and display for the user after login with comprehensive error handling, retry mechanisms, and fallback strategies
- Multiple retry attempts with exponential backoff if wallet address fetching fails
- Clear error messages and retry options presented to the user if address loading fails
- Wallet address displayed in a dark rounded rectangle with #CC8800 text color exactly as shown in "Deposit.png" design
- Wallet address is clickable and copies to clipboard with immediate visual confirmation (toast notification or highlight effect showing "Copied!")
- Two buttons below the address: "Copy my wallet address" and "Skip for now" with no rounded corners
- "Copy my wallet address" button must be fully functional and enabled, copying the address to clipboard with clear visual feedback and confirmation
- "Copy my wallet address" button styled with #ffffff border color, white background, black text
- "Skip for now" button must be enabled and immediately advance the user directly to the main wallet dashboard without any delays or additional processing
- "Skip for now" button styled with #818181 border color, black background, white text
- Layout and spacing must exactly match the provided "Deposit.png" design reference with precise text centering, address and button placement at the bottom, correct border and color styles, and exact spacing and alignment
- Comprehensive error handling with clear user feedback, retry options, and fallback states for wallet address fetch failures
- Loading states with appropriate indicators while wallet address is being fetched
- After completing the deposit screen (either by copying address or skipping), users proceed directly to the main wallet dashboard with no intermediate screens or transitions
- Onboarding completion marks the user as having completed the flow
- Returning users (onboarding already completed) skip the onboarding flow and go directly to the main wallet dashboard after authentication
- Wallet provisioning and address generation must be robust and handle all edge cases including network failures, timeout scenarios, and authentication state changes
- The onboarding flow must function correctly regardless of previous onboarding completion status or sign-out/reset actions

## Onboarding Reset Feature
- Users can reset their onboarding state to re-experience the first-time user flow
- Reset action clears the user's onboarding completion status
- After reset, the user will see the onboarding flow (deposit screen only) on their next login
- Clear UI element (button or menu option) available in the main wallet interface to trigger the onboarding reset
- Reset action requires user confirmation to prevent accidental resets

## Core Features

### Wallet Management
- Automatic wallet creation for new users upon Internet Identity authentication
- Generate unique Bitcoin addresses for each user using ICP's Bitcoin API
- Display user's current Bitcoin balance
- Show complete transaction history for the user's addresses
- QR code generation for receiving Bitcoin payments
- Seamless user experience with no wallet creation prompts

### Transaction Capabilities
- Send Bitcoin transactions to any valid Bitcoin address
- Transaction signing and broadcasting performed entirely within the canister
- Real-time transaction status updates

### Security Model
- Private key generation and storage handled exclusively within the canister
- Chain-key cryptography ensures private keys never leave the secure environment
- All Bitcoin operations (address generation, signing, broadcasting) performed on-chain

## Backend Data Storage
- User account information linked to Internet Identity principals
- Encrypted private key material for each user
- Transaction history and metadata
- Bitcoin address mappings for users
- Wallet existence tracking per user account
- User onboarding completion status to control onboarding flow display and determine first-time vs returning user experience

## Backend Operations
- Integration with ICP's native Bitcoin API for:
  - Address generation and validation
  - Balance queries and UTXO management
  - Transaction signing and broadcasting
  - Network fee estimation
- Secure key management using threshold cryptography
- User session management and authentication verification
- Automatic wallet initialization for new users with robust error handling and retry logic
- Wallet existence verification and creation logic with comprehensive error recovery
- Reliable wallet address retrieval with multiple retry attempts, exponential backoff, timeout handling, and comprehensive error recovery mechanisms
- Wallet address fetching must be fault-tolerant with proper error propagation to the frontend
- Onboarding state management to track completion status and control post-authentication flow routing
- Onboarding reset functionality to clear user's onboarding completion status
- Session termination and state clearing functionality for sign out and reset operations
- Robust wallet-to-Internet Identity account linking with verification and error handling
- Comprehensive logging and monitoring for wallet provisioning and address generation failures
- Enhanced wallet provisioning logic that ensures correct linking between Internet Identity accounts and wallets across all scenarios including first-time users, returning users, and users who have performed sign-out/reset actions
- Improved error handling and recovery mechanisms for wallet address generation and retrieval operations
- Reliable backend API endpoints for wallet address fetching with proper authentication verification and error responses

## Technical Architecture
- Frontend served directly from ICP canister
- No external APIs, bridges, or centralized services
- All Bitcoin network interactions through ICP's Bitcoin integration
- Prepared infrastructure for future ckBTC integration (not implemented)

## User Interface
- Clean, intuitive wallet interface with market.town branding
- Splash screen displays "mt mark.svg" and "mt type.svg" stacked vertically and centered
- Visually prominent animated transition where "mt type.svg" fades out and "mt mark.svg" smoothly slides upward from its centered position on the splash screen to the top position of the sign-in screen with seamless motion and brand-appropriate timing and easing, running 50% slower than standard speed for enhanced smoothness
- Sign-in screen features "mt mark.svg" at the top with properly formatted welcome text:
  - "Welcome to Market Town, your new Bitcoin wallet."
  - "Like a cash wallet, use this is for everyday transactions, not your life savings."
  - "Remember: your phone is your wallet."
  - "Keep it safe."
- "Sign In" button positioned at the bottom of the sign-in screen with size, padding, font, and border radius exactly matching the primary action button style used on the onboarding deposit screen for visual consistency
- Deposit onboarding screen with main title text "Deposit Bitcoin to fund your wallet." vertically and horizontally centered in the available space
- Wallet address and action buttons anchored at the bottom of the screen
- Wallet address displayed in dark rounded rectangle with #CC8800 text color exactly matching "Deposit.png" design
- Clickable wallet address with reliable clipboard copy functionality and immediate visual confirmation feedback
- Action buttons with no rounded corners: "Copy my wallet address" with #ffffff border color and white background with black text, and "Skip for now" with #818181 border color, black background and white text
- Layout and spacing must exactly match the provided "Deposit.png" design reference with precise alignment and positioning
- Comprehensive loading states and error handling with clear user feedback, retry buttons, and appropriate fallback messaging for wallet address failures
- Error states must provide clear instructions and retry options for users
- Balance and transaction history display
- Send transaction form with address validation
- QR code display for receiving payments
- Transaction status notifications
- Seamless login experience with automatic wallet provisioning
- Frontend automatically checks wallet existence and triggers creation if needed with proper error handling
- Post-authentication routing: first-time users see deposit onboarding screen, then proceed directly to wallet dashboard after completing the deposit screen with no intermediate screens
- Onboarding reset option accessible through a clear UI element (button or menu option) in the main wallet interface
- Sign out and reset option accessible through a clear UI element (button or menu option) in the main wallet interface
- Confirmation dialog for both onboarding reset and sign out actions to prevent accidental operations
- Complete session clearing and return to splash screen functionality for sign out operations
- Enhanced frontend logic for wallet address fetching with proper API integration, error handling, and user feedback
- Improved onboarding screen functionality ensuring both "Copy my wallet address" and "Skip for now" buttons work correctly
- Robust frontend state management for wallet provisioning and onboarding flow across all user scenarios
- Application content in English language
