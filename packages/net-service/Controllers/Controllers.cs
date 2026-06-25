using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using LucyNetService.Models;
using LucyNetService.Services;

namespace LucyNetService.Controllers;

// Auth + User endpoints (no auth required for register/login)
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    public AuthController(AuthService authService) => _authService = authService;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        var result = await _authService.RegisterAsync(req);
        return result is null ? BadRequest(new { message = "Email already exists" }) : Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var result = await _authService.LoginAsync(req);
        return result is null ? Unauthorized(new { message = "Invalid credentials" }) : Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest req)
    {
        var result = await _authService.RefreshTokenAsync(req.RefreshToken);
        return result is null ? Unauthorized() : Ok(result);
    }
}

// Authenticated user endpoints
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;
    public UsersController(UserService userService) => _userService = userService;

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userId = int.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        var user = await _userService.GetByIdAsync(userId);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(int id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
    {
        return Ok(await _userService.GetAllAsync());
    }

    [HttpGet("leaderboard")]
    public async Task<ActionResult<List<LeaderboardEntry>>> GetLeaderboard()
    {
        return Ok(await _userService.GetLeaderboardAsync());
    }
}

// Wallet endpoints
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly WalletService _walletService;
    public WalletController(WalletService walletService) => _walletService = walletService;

    [HttpGet]
    public async Task<ActionResult<WalletResponse>> GetWallet()
    {
        var userId = int.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        return Ok(await _walletService.GetWalletAsync(userId));
    }

    [HttpPost("deposit")]
    public async Task<ActionResult<WalletResponse>> Deposit([FromBody] DepositRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        var result = await _walletService.DepositAsync(userId, req.Amount);
        return result is null ? BadRequest(new { message = "Invalid amount" }) : Ok(result);
    }
}

// Gift endpoints — uses anonId (NOT real userId) to keep identities hidden
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GiftsController : ControllerBase
{
    private readonly WalletService _walletService;
    public GiftsController(WalletService walletService) => _walletService = walletService;

    [HttpPost("send")]
    public async Task<ActionResult> SendGift([FromBody] SendGiftRequest req)
    {
        var senderId = int.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        var result = await _walletService.SendGiftAsync(senderId, req);
        return result is null
            ? BadRequest(new { message = "Insufficient balance or invalid recipient" })
            : Ok(result);
    }
}

// INTERNAL SERVICE ENDPOINTS — called ONLY by Node.js service, no public exposure
// These resolve anonymous tokens back to real userId for host auth and ledger operations
[ApiController]
[Route("api/[controller]")]
[ApiKeyAuth]
public class AnonController : ControllerBase
{
    private readonly LucyNetService.Data.LucyDbContext _db;
    private readonly AuthService _authService;

    public AnonController(LucyNetService.Data.LucyDbContext db, AuthService authService)
    {
        _db = db;
        _authService = authService;
    }

    [HttpPost("resolve-host")]
    public async Task<ActionResult> ResolveHost([FromBody] ResolveHostRequest req)
    {
        var anon = _authService.DecodeAnonToken(req.AnonToken);
        if (anon is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.AnonToken == req.AnonToken);
        return user is null ? Unauthorized() : Ok(new { userId = user.Id });
    }

    [HttpPost("resolve-recipient")]
    public async Task<ActionResult<ResolveRecipientResponse>> ResolveRecipient([FromBody] ResolveRecipientRequest req)
    {
        var anon = _authService.DecodeAnonToken(req.RecipientAnonId);
        if (anon is null) return NotFound();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.AnonToken == req.RecipientAnonId);
        if (user is null) return NotFound();

        return Ok(new ResolveRecipientResponse(user.Id, anon.AnonName, anon.PersonaId, user.Role.ToString()));
    }
}

// Records
public record RefreshRequest(string RefreshToken);
public record ResolveHostRequest(string AnonToken);
public record ResolveRecipientRequest(string RecipientAnonId);
public record ResolveRecipientResponse(int UserId, string AnonName, int PersonaId, string Role);

// Simple API key authorization for internal endpoints
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ApiKeyAuthAttribute : Microsoft.AspNetCore.Authorization.AuthorizeAttribute
{
    public ApiKeyAuthAttribute() => Policy = "InternalApiKey";
}
