using LucyNetService.Data;
using LucyNetService.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseInMemoryDatabase("LucyDb"));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LUCY .NET Service", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "https://lucygroup.vercel.app", "http://lucygroup.vercel.app")
              .SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var sampleAccounts = app.Configuration.GetSection("SampleAccounts").Get<List<SampleAccountConfig>>();
    if (sampleAccounts != null && sampleAccounts.Any())
    {
        foreach (var acc in sampleAccounts)
        {
            var emailLower = acc.Email.ToLower().Trim();
            if (!db.Users.Any(u => u.Email == emailLower))
            {
                var user = new User
                {
                    Email = emailLower,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(acc.Password),
                    DisplayName = acc.DisplayName.Trim(),
                    PersonaId = acc.PersonaId,
                    Role = acc.Role,
                    WalletBalance = 500m
                };
                db.Users.Add(user);
                db.SaveChanges();

                db.WalletLedger.Add(new WalletLedger
                {
                    UserId = user.Id,
                    Amount = 500m,
                    Type = "Deposit",
                    Description = "Welcome bonus"
                });
            }
        }
        db.SaveChanges();
    }
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "LUCY .NET Service v1"));

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("\n🔐 LUCY .NET Identity & Payment Service");
Console.WriteLine("📄 Swagger UI: http://localhost:5001/swagger\n");

app.Run("http://localhost:5001");

public class SampleAccountConfig
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Role { get; set; } = "LUCY";
    public int PersonaId { get; set; } = 1;
}

