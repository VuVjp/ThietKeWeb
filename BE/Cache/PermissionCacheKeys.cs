public static class PermissionCacheKeys
{
    private const string Prefix = "permissions:user:";

    public static string ForUser(int userId)
    {
        return $"{Prefix}{userId}";
    }
}
