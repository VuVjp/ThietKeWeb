public static class TokenVersionCacheKeys
{
    private const string Prefix = "tokenver:user:";

    public static string ForUser(int userId)
    {
        return $"{Prefix}{userId}";
    }
}
