using Microsoft.EntityFrameworkCore;
using LucyNetService.Models;

namespace LucyNetService.Data;

public class LucyDbContext : DbContext
{
    public LucyDbContext() : base() { }

    public DbSet<User> Users => Set<User>();
    public DbSet<GiftTransaction> GiftTransactions => Set<GiftTransaction>();
    public DbSet<WalletLedger> WalletLedgers => Set<WalletLedger>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseInMemoryDatabase("LucyDB");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.WalletBalance).HasPrecision(18, 2);
        });

        modelBuilder.Entity<GiftTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<WalletLedger>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
        });
    }
}
