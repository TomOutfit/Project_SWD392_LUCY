using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using LucyNetService.Data;
using LucyNetService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
  c.SwaggerDoc("v1", new() { Title = "LUCY Identity & Payment API", Version = "v1" });
  c.AddSecurityDefinition("Bearer", new() {
    Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
    Scheme = "bearer", BearerFormat = "JWT",
    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
    Description = "JWT Authorization header using the Bearer scheme."
  });
  c.AddSecurityRequirement(new() {
    {
      new() {
        Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
      },
      Array.Empty<string>()
    }
  });
});

builder.Services.AddSingleton<LucyDbContext>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<WalletService>();
builder.Services.AddScoped<UserService>();

var secret = builder.Configuration["Jwt:Secret"] ?? "LUCY_SUPER_SECRET_KEY_2026_VERY_LONG_TOKEN_KEY_FOR_JWT";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(options => {
    options.TokenValidationParameters = new() {
      ValidateIssuer = false,
      ValidateAudience = false,
      ValidateLifetime = true,
      ValidateIssuerSigningKey = true,
      IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
    };
  });

builder.Services.AddCors(options => {
  options.AddPolicy("AllowFrontend", policy => {
    policy.WithOrigins("http://localhost:5173", "http://localhost:4173")
      .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
  });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope()) {
  var db = scope.ServiceProvider.GetRequiredService<LucyDbContext>();
  db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run("http://0.0.0.0:5001");
