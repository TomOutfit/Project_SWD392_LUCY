using LucyNetService.Models;
using Microsoft.EntityFrameworkCore;

namespace LucyNetService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<GiftTransaction> GiftTransactions => Set<GiftTransaction>();
    public DbSet<WalletLedger> WalletLedger => Set<WalletLedger>();
}
