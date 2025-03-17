use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::token::{self, Token, TokenAccount, Mint, burn};

declare_id!("2gfJsBnr74xVFPhgxJFAfZLvy8y3FnUDppcRoEGsQ3dm");

/********************************************
 * UNIVERSE SOLANA - Main Implementation
 * 
 * This contract implements all functionality for:
 * - Planet creation and management
 * - 8-hour reward cycles
 * - Compound mechanics and planet evolution
 * - NFT representation of planets
 * - Token taxation system
 * - Vesting mechanics for locked tokens
 * 
 * NOTE: Pinksale will handle:
 * - Initial token creation (SPL token)
 * - Presale with 100 SOL hard cap
 * - 1 SOL wallet limit for presale
 * - Initial liquidity creation & locking (100% of funds)
 * - Initial token distribution to presale participants
 ********************************************/

#[program]
pub mod universe_solana_backend {
    use super::*;

    /*** INITIALIZATION FUNCTIONS ***/

    /// Initialize the main configuration for Universe Solana
    /// This should be called by the admin after token creation via Pinksale
    pub fn initialize(ctx: Context<Initialize>, token_mint: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        // Set basic configuration parameters from gitbook
        config.total_supply = 1_000_000_000 * 10u64.pow(9); // 1 billion $UNIV with 9 decimals
        config.planet_creation_cost = 1_000 * 10u64.pow(9); // 1,000 $UNIV to create a planet
        config.max_planets_per_user = 10; // Maximum 10 planets per user
        config.reward_rate = 4; // 4% daily rewards
        config.reward_interval = 28_800; // 8 hours in seconds
        config.admin = ctx.accounts.admin.key();
        
        // Store token mint
        config.token_mint = token_mint;
        
        // Set up wallet addresses
        config.reward_pool = ctx.accounts.reward_pool.key();
        config.team_wallet = ctx.accounts.team_wallet.key();
        config.marketing_wallet = ctx.accounts.marketing_wallet.key();
        config.liquidity_wallet = ctx.accounts.liquidity_wallet.key();
        
        // Set tax rates
        config.transaction_tax_rate = 3; // 3% total transaction tax
        config.liquidity_tax_rate = 1; // 1% goes to liquidity (33% of total tax)
        config.reward_tax_rate = 2; // 2% goes to rewards (67% of total tax)
        
        config.nft_transfer_tax_rate = 5; // 5% tax on NFT transfers
        config.team_nft_tax_rate = 2; // 2% of NFT tax to team wallet
        config.reward_nft_tax_rate = 3; // 3% of NFT tax to rewards pool
        
        // Initialize authority bump
        config.authority_bump = ctx.bumps.authority;
        
        // Initialize vesting parameters for the 43% locked tokens
        config.vesting_start_time = Clock::get()?.unix_timestamp;
        config.ecosystem_vesting_duration = 365 * 24 * 60 * 60; // 1 year in seconds
        config.treasury_vesting_duration = 365 * 24 * 60 * 60; // 1 year in seconds
        
        msg!("Universe Solana initialized with config: {:?}", config);
        Ok(())
    }
    
    /// Initialize a new user account
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user = &mut ctx.accounts.user;
        user.authority = ctx.accounts.authority.key();
        user.planets = Vec::new();
        
        msg!("User initialized: {:?}", user.authority);
        Ok(())
    }
    
    /// Set up vesting for locked tokens
    /// This should be called after token creation and initial distribution
    pub fn setup_vesting(
        ctx: Context<SetupVesting>, 
        ecosystem_amount: u64, 
        treasury_amount: u64, 
        burn_reserve_amount: u64
    ) -> Result<()> {
        let vesting = &mut ctx.accounts.vesting;
        
        // Set amounts for different vesting categories
        vesting.ecosystem_amount = ecosystem_amount; // 20% of total supply
        vesting.treasury_amount = treasury_amount; // 15% of total supply
        vesting.burn_reserve_amount = burn_reserve_amount; // 8% of total supply
        
        vesting.ecosystem_claimed = 0;
        vesting.treasury_claimed = 0;
        vesting.last_claim_time = Clock::get()?.unix_timestamp;
        
        msg!("Vesting initialized: Ecosystem: {}, Treasury: {}, Burn Reserve: {}", 
            ecosystem_amount, treasury_amount, burn_reserve_amount);
        Ok(())
    }

    /*** CORE FUNCTIONALITY ***/
    
    /// Create a new planet (costs 1,000 $UNIV)
    pub fn create_planet(ctx: Context<CreatePlanet>) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let config = &ctx.accounts.config;
        let planet_account = &mut ctx.accounts.planet_account;
        let token_account = &ctx.accounts.token_account;
        let clock = Clock::get()?;

        // Check user constraints
        require!(
            user.planets.len() < config.max_planets_per_user as usize,
            ErrorCode::MaxPlanetsReached
        );

        // Create planet account - starting as Earth
        planet_account.owner = user.key();
        planet_account.compound_level = 0;
        planet_account.daily_reward = 4; // Starting reward is 4%
        planet_account.last_claim = clock.unix_timestamp;
        planet_account.locked_tokens = config.planet_creation_cost;
        planet_account.name = "Earth".to_string();
        
        // Generate unique ID for this planet
        planet_account.planet_id = planet_account.key();
        
        // Transfer tokens from user to reward pool
        let cpi_accounts = token::Transfer {
            from: token_account.to_account_info(),
            to: ctx.accounts.reward_pool.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, config.planet_creation_cost)?;

        // For NFT creation, we'd normally integrate with Metaplex here
        // In testing phase, we'll just simulate this and log the event
        msg!("NFT would be created for planet: {}, Symbol: UNIV-PLANET, URI: https://universe-solana.com/metadata/{}.json", 
             planet_account.name, planet_account.key());
        
        // Add planet to user's list
        user.planets.push(planet_account.key());
        
        msg!("Planet created for user {:?}", user.authority);
        Ok(())
    }

    /// Claim rewards (requires 8 hours since last claim)
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let planet = &mut ctx.accounts.planet_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;
        let elapsed = clock.unix_timestamp - planet.last_claim;

        // Check if reward interval has passed
        require!(
            elapsed >= config.reward_interval as i64,
            ErrorCode::RewardNotReady
        );

        // Calculate reward based on compound level and elapsed time
        let intervals = elapsed as f64 / config.reward_interval as f64;
        let daily_rate = planet.daily_reward as f64 / 100.0; // Convert percentage to decimal
        let reward = (daily_rate * planet.locked_tokens as f64) * intervals;
        
        // Create PDA signer for reward pool
        let authority_seeds = &[
            b"authority".as_ref(),
            &[config.authority_bump],
        ];
        let signer = &[&authority_seeds[..]];
        
        // Transfer reward tokens from pool to user
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.reward_pool.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(
            cpi_program,
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, reward as u64)?;

        // Update last claim timestamp
        planet.last_claim = clock.unix_timestamp;
        
        msg!("Claimed {} reward tokens", reward);
        Ok(())
    }

    /// Compound rewards to upgrade planet
    pub fn compound_rewards(ctx: Context<CompoundRewards>) -> Result<()> {
        let planet = &mut ctx.accounts.planet_account;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;
        let elapsed = clock.unix_timestamp - planet.last_claim;

        // Check if reward interval has passed
        require!(
            elapsed >= config.reward_interval as i64,
            ErrorCode::RewardNotReady
        );

        // Calculate reward
        let intervals = elapsed as f64 / config.reward_interval as f64;
        let daily_rate = planet.daily_reward as f64 / 100.0;
        let reward = (daily_rate * planet.locked_tokens as f64) * intervals;
        
        // Add rewards to locked tokens
        planet.locked_tokens += reward as u64;
        
        // Increase compound level
        planet.compound_level += 1;
        
        // Update daily reward based on compound level
        planet.daily_reward = get_reward_for_level(planet.compound_level)?;
        
        // Update planet name based on compound level
        planet.name = get_planet_name_for_level(planet.compound_level);
        
        // For NFT metadata updates, we'd integrate with Metaplex here
        // In testing phase, we'll just simulate this and log the event
        msg!("NFT metadata would be updated for planet: {}, Symbol: UNIV-PLANET-{}, URI: https://universe-solana.com/metadata/{}.json", 
             planet.name, planet.compound_level, planet.key());
        
        // Update last claim timestamp
        planet.last_claim = clock.unix_timestamp;
        
        msg!("Compounded rewards. New locked tokens: {}, New compound level: {}, New daily reward: {}%, Planet: {}",
            planet.locked_tokens, planet.compound_level, planet.daily_reward, planet.name);
        Ok(())
    }

    /// Transfer planet NFT to another user (with 5% tax)
    pub fn transfer_planet(ctx: Context<TransferPlanet>) -> Result<()> {
        let planet = &mut ctx.accounts.planet_account;
        let seller = &mut ctx.accounts.seller;
        let buyer = &mut ctx.accounts.buyer;
        let config = &ctx.accounts.config;

        // Calculate transfer tax (5% of locked tokens)
        let tax = (planet.locked_tokens as f64 * (config.nft_transfer_tax_rate as f64 / 100.0)) as u64;
        let team_tax = (tax as f64 * (config.team_nft_tax_rate as f64 / config.nft_transfer_tax_rate as f64)) as u64;
        let reward_tax = tax - team_tax;
        
        // Transfer tax to team wallet
        let cpi_accounts_team = token::Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.team_wallet.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(
            cpi_program.clone(),
            cpi_accounts_team,
        );
        token::transfer(cpi_ctx, team_tax)?;

        // Transfer tax to reward pool
        let cpi_accounts_reward = token::Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.reward_pool.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            cpi_program,
            cpi_accounts_reward,
        );
        token::transfer(cpi_ctx, reward_tax)?;

        // Update planet ownership
        planet.owner = buyer.key();
        
        // Update buyer and seller planet lists
        buyer.planets.push(planet.key());
        seller.planets.retain(|&x| x != planet.key());
        
        msg!("Planet transferred from {:?} to {:?} with tax: {}", seller.key(), buyer.key(), tax);
        Ok(())
    }
    
    /*** TOKEN ECONOMICS FUNCTIONS ***/
    
    /// Transfer $UNIV tokens with 3% tax (1% liquidity, 2% rewards)
    pub fn transfer_with_tax(ctx: Context<TransferWithTax>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        
        // Calculate tax amounts
        let total_tax = (amount as f64 * (config.transaction_tax_rate as f64 / 100.0)) as u64;
        let liquidity_tax = (amount as f64 * (config.liquidity_tax_rate as f64 / 100.0)) as u64;
        let reward_tax = (amount as f64 * (config.reward_tax_rate as f64 / 100.0)) as u64;
        
        // Verify tax calculation
        require!(
            liquidity_tax + reward_tax <= total_tax,
            ErrorCode::InvalidTaxCalculation
        );
        
        // Calculate amount after tax
        let transfer_amount = amount - total_tax;
        
        // Transfer liquidity tax
        let cpi_accounts_liquidity = token::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.liquidity_wallet.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(
            cpi_program.clone(),
            cpi_accounts_liquidity,
        );
        token::transfer(cpi_ctx, liquidity_tax)?;
        
        // Transfer reward tax
        let cpi_accounts_reward = token::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.reward_pool.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            cpi_program.clone(),
            cpi_accounts_reward,
        );
        token::transfer(cpi_ctx, reward_tax)?;
        
        // Transfer main amount to recipient
        let cpi_accounts_main = token::Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            cpi_program,
            cpi_accounts_main,
        );
        token::transfer(cpi_ctx, transfer_amount)?;
        
        msg!("Transferred {} $UNIV with {} tax ({}+{})", 
            transfer_amount, total_tax, liquidity_tax, reward_tax);
        Ok(())
    }
    
    /// Claim vested tokens (for ecosystem development and treasury)
    pub fn claim_vested_tokens(
        ctx: Context<ClaimVestedTokens>, 
        vesting_type: VestingType
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let vesting = &mut ctx.accounts.vesting;
        let clock = Clock::get()?;
        
        // Only admin can call this function
        require!(
            ctx.accounts.authority.key() == config.admin,
            ErrorCode::Unauthorized
        );
        
        // Calculate time elapsed since vesting start
        let elapsed = clock.unix_timestamp - config.vesting_start_time;
        
        // Create PDA signer for reward pool
        let authority_seeds = &[
            b"authority".as_ref(),
            &[config.authority_bump],
        ];
        let signer = &[&authority_seeds[..]];
        
        match vesting_type {
            VestingType::Ecosystem => {
                // Calculate claimable amount based on linear vesting over 1 year
                let total_vesting_period = config.ecosystem_vesting_duration;
                let vesting_progress = elapsed as f64 / total_vesting_period as f64;
                let claimable_amount = (vesting.ecosystem_amount as f64 * vesting_progress) as u64;
                
                // Calculate amount not yet claimed
                let remaining_claimable = claimable_amount.saturating_sub(vesting.ecosystem_claimed);
                
                // Check if there's anything to claim
                require!(
                    remaining_claimable > 0,
                    ErrorCode::NoVestedTokens
                );
                
                // Transfer vested tokens
                let cpi_accounts = token::Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(
                    cpi_program,
                    cpi_accounts,
                    signer,
                );
                token::transfer(cpi_ctx, remaining_claimable)?;
                
                // Update claimed amount
                vesting.ecosystem_claimed += remaining_claimable;
                
                msg!("Claimed {} ecosystem vested tokens", remaining_claimable);
            },
            VestingType::Treasury => {
                // Calculate claimable amount based on linear vesting over 1 year
                let total_vesting_period = config.treasury_vesting_duration;
                let vesting_progress = elapsed as f64 / total_vesting_period as f64;
                let claimable_amount = (vesting.treasury_amount as f64 * vesting_progress) as u64;
                
                // Calculate amount not yet claimed
                let remaining_claimable = claimable_amount.saturating_sub(vesting.treasury_claimed);
                
                // Check if there's anything to claim
                require!(
                    remaining_claimable > 0,
                    ErrorCode::NoVestedTokens
                );
                
                // Transfer vested tokens
                let cpi_accounts = token::Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(
                    cpi_program,
                    cpi_accounts,
                    signer,
                );
                token::transfer(cpi_ctx, remaining_claimable)?;
                
                // Update claimed amount
                vesting.treasury_claimed += remaining_claimable;
                
                msg!("Claimed {} treasury vested tokens", remaining_claimable);
            },
        }
        
        // Update last claim time
        vesting.last_claim_time = clock.unix_timestamp;
        
        Ok(())
    }
    
    /// Burn tokens from burn reserve (for deflationary mechanism)
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        
        // Only admin can call this function
        require!(
            ctx.accounts.authority.key() == config.admin,
            ErrorCode::Unauthorized
        );
        
        // Burn tokens
        let cpi_accounts = token::Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.burn_reserve.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(
            cpi_program,
            cpi_accounts,
        );
        token::burn(cpi_ctx, amount)?;
        
        msg!("Burned {} tokens from burn reserve", amount);
        Ok(())
    }
    
    /*** ADMIN FUNCTIONS ***/
    
    /// Update configuration parameters (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        reward_rate: Option<u8>,
        planet_creation_cost: Option<u64>,
        transaction_tax_rate: Option<u8>,
        liquidity_tax_rate: Option<u8>,
        reward_tax_rate: Option<u8>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        
        // Only admin can update config
        require!(
            ctx.accounts.authority.key() == config.admin,
            ErrorCode::Unauthorized
        );
        
        // Update config parameters if provided
        if let Some(rate) = reward_rate {
            config.reward_rate = rate;
        }
        
        if let Some(cost) = planet_creation_cost {
            config.planet_creation_cost = cost;
        }
        
        if let Some(tax) = transaction_tax_rate {
            config.transaction_tax_rate = tax;
        }
        
        if let Some(tax) = liquidity_tax_rate {
            config.liquidity_tax_rate = tax;
        }
        
        if let Some(tax) = reward_tax_rate {
            config.reward_tax_rate = tax;
        }
        
        // Validate tax rates
        require!(
            config.liquidity_tax_rate + config.reward_tax_rate <= config.transaction_tax_rate,
            ErrorCode::InvalidTaxRates
        );
        
        msg!("Config updated");
        Ok(())
    }
}

/*** CONTEXT STRUCTS ***/

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 32 + 8 + 8 + 8 + 8 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 1 + 1 + 1 + 1 + 8 + 8 + 8)]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// CHECK: This is the token reward pool
    #[account(mut)]
    pub reward_pool: AccountInfo<'info>,
    
    /// CHECK: This is the team wallet
    #[account(mut)]
    pub team_wallet: AccountInfo<'info>,
    
    /// CHECK: This is the marketing wallet
    #[account(mut)]
    pub marketing_wallet: AccountInfo<'info>,
    
    /// CHECK: This is the liquidity wallet
    #[account(mut)]
    pub liquidity_wallet: AccountInfo<'info>,
    
    /// CHECK: PDA to be used as authority for reward pool operations
    #[account(
        seeds = [b"authority"],
        bump,
    )]
    pub authority: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + (10 * 32) // Support for max 10 planets
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetupVesting<'info> {
    #[account(init, payer = authority, space = 8 + 8 + 8 + 8 + 8 + 8 + 8)]
    pub vesting: Account<'info, Vesting>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        constraint = config.admin == authority.key()
    )]
    pub config: Account<'info, Config>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreatePlanet<'info> {
    #[account(mut)]
    pub user: Account<'info, User>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 1 + 8 + 8 + 64 + 32 // Add extra space for name and planet_id
    )]
    pub planet_account: Account<'info, Planet>,
    
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub reward_pool: Account<'info, TokenAccount>,
    
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Account<'info, User>,
    
    #[account(
        mut,
        constraint = planet_account.owner == user.key()
    )]
    pub planet_account: Account<'info, Planet>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub reward_pool: Account<'info, TokenAccount>,
    
    pub config: Account<'info, Config>,
    
    /// CHECK: This is the PDA that acts as the authority for the reward pool
    #[account(
        seeds = [b"authority"],
        bump = config.authority_bump,
    )]
    pub authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CompoundRewards<'info> {
    #[account(mut)]
    pub user: Account<'info, User>,
    
    #[account(
        mut,
        constraint = planet_account.owner == user.key()
    )]
    pub planet_account: Account<'info, Planet>,
    
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferPlanet<'info> {
    #[account(
        mut,
        constraint = planet_account.owner == seller.key()
    )]
    pub planet_account: Account<'info, Planet>,
    
    #[account(mut)]
    pub seller: Account<'info, User>,
    
    #[account(mut)]
    pub buyer: Account<'info, User>,
    
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub reward_pool: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub team_wallet: Account<'info, TokenAccount>,
    
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferWithTax<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub reward_pool: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub liquidity_wallet: Account<'info, TokenAccount>,
    
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimVestedTokens<'info> {
    #[account(mut)]
    pub vesting: Account<'info, Vesting>,
    
    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,
    
    pub config: Account<'info, Config>,
    
    /// CHECK: This is the PDA that acts as the authority for the token vault
    #[account(
        seeds = [b"authority"],
        bump = config.authority_bump,
    )]
    pub authority: AccountInfo<'info>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub burn_reserve: Account<'info, TokenAccount>,
    
    #[account(
        constraint = authority.key() == config.admin
    )]
    pub authority: Signer<'info>,
    
    pub config: Account<'info, Config>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,
    
    #[account(
        constraint = authority.key() == config.admin
    )]
    pub authority: Signer<'info>,
}

/*** DATA STRUCTURES ***/

#[account]
#[derive(Debug)]
pub struct Config {
    pub total_supply: u64,
    pub planet_creation_cost: u64,
    pub max_planets_per_user: u8,
    pub reward_rate: u8,
    pub reward_interval: u32,
    pub token_mint: Pubkey,
    pub admin: Pubkey,
    pub reward_pool: Pubkey,
    pub team_wallet: Pubkey,
    pub marketing_wallet: Pubkey,
    pub liquidity_wallet: Pubkey,
    pub authority_bump: u8,
    pub transaction_tax_rate: u8,
    pub liquidity_tax_rate: u8,
    pub reward_tax_rate: u8,
    pub nft_transfer_tax_rate: u8,
    pub team_nft_tax_rate: u8,
    pub reward_nft_tax_rate: u8,
    pub vesting_start_time: i64,
    pub ecosystem_vesting_duration: i64,
    pub treasury_vesting_duration: i64,
}

#[account]
#[derive(Debug)]
pub struct User {
    pub authority: Pubkey,
    pub planets: Vec<Pubkey>,
}

#[account]
#[derive(Debug)]
pub struct Planet {
    pub owner: Pubkey,
    pub compound_level: u8,
    pub daily_reward: u8,
    pub last_claim: i64,
    pub locked_tokens: u64,
    pub name: String,
    pub planet_id: Pubkey,
}

#[account]
#[derive(Debug)]
pub struct Vesting {
    pub ecosystem_amount: u64,
    pub treasury_amount: u64,
    pub burn_reserve_amount: u64,
    pub ecosystem_claimed: u64,
    pub treasury_claimed: u64,
    pub last_claim_time: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum VestingType {
    Ecosystem,
    Treasury,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds to create a planet.")]
    InsufficientFunds,
    #[msg("Maximum number of planets reached.")]
    MaxPlanetsReached,
    #[msg("Reward not ready to be claimed or compounded.")]
    RewardNotReady,
    #[msg("Invalid compound level.")]
    InvalidCompoundLevel,
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Invalid tax calculation.")]
    InvalidTaxCalculation,
    #[msg("Invalid tax rates configuration.")]
    InvalidTaxRates,
    #[msg("No vested tokens available to claim.")]
    NoVestedTokens,
}

/*** UTILITY FUNCTIONS ***/

fn get_reward_for_level(compound_level: u8) -> Result<u8> {
    match compound_level {
        0 => Ok(4),  // Earth - 4%
        1 => Ok(5),  // Moon - 5%
        2 => Ok(6),  // Mercury - 6%
        3 => Ok(7),  // Venus - 7%
        4 => Ok(8),  // Mars - 8%
        5 => Ok(9),  // Jupiter - 9%
        6 => Ok(10), // Saturn - 10%
        7 => Ok(11), // Uranus - 11%
        8 => Ok(12), // Neptune - 12%
        10 => Ok(14), // Sun - 14%
        _ => Err(ErrorCode::InvalidCompoundLevel.into()),
    }
}

fn get_planet_name_for_level(compound_level: u8) -> String {
    match compound_level {
        0 => "Earth".to_string(),
        1 => "Moon".to_string(),
        2 => "Mercury".to_string(),
        3 => "Venus".to_string(),
        4 => "Mars".to_string(),
        5 => "Jupiter".to_string(),
        6 => "Saturn".to_string(),
        7 => "Uranus".to_string(),
        8 => "Neptune".to_string(),
        10 => "Sun".to_string(),
        _ => "Unknown".to_string(),
    }
}

/*************************************************************
 * NOTES ON PINKSALE INTEGRATION
 * 
 * The following should be handled by Pinksale:
 * 
 * 1. Token Creation:
 *    - Create the $UNIV SPL token with 9 decimals
 *    - Total supply: 1,000,000,000 tokens
 * 
 * 2. Presale Configuration:
 *    - Hard cap: 100 SOL 
 *    - Wallet limit: 1 SOL per wallet
 *    - Token price: $0.0001 per token
 * 
 * 3. Liquidity Creation:
 *    - 100% of presale funds added to liquidity
 *    - Liquidity locked for 6 months
 * 
 * 4. Initial Token Distribution:
 *    - 57% of total supply available at launch:
 *      - 50% for public circulation
 *      - 7% reallocated from marketing/team
 *    - 43% locked with vesting:
 *      - 20% Ecosystem development (vested over 1 year)
 *      - 15% Treasury (vested over 1 year)
 *      - 8% reserved for future burns or community incentives
 * 
 * 5. Wallet Allocations Setup:
 *    - 7% Rewards Wallet
 *    - 10% Marketing Wallet 
 *    - 8% Team Wallet
 * 
 * After Pinksale completes these steps, this smart contract
 * should be initialized with the correct token mint address
 * and wallet addresses to take over the core functionality.
 *************************************************************/