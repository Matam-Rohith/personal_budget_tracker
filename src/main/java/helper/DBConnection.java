package helper;

import java.sql.Connection;
import java.sql.DriverManager;

public class DBConnection {

    public static Connection getConnection() {
        try {
            String host     = System.getenv("MYSQLHOST");
            String port     = System.getenv("MYSQLPORT");
            String database = System.getenv("MYSQLDATABASE");
            String user     = System.getenv("MYSQLUSER");
            String password = System.getenv("MYSQLPASSWORD");

            String url = "jdbc:mysql://" + host + ":" + port + "/" + database
                       + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";

            Class.forName("com.mysql.cj.jdbc.Driver");
            return DriverManager.getConnection(url, user, password);

        } catch (Exception e) {
            throw new RuntimeException("Database connection failed: " + e.getMessage(), e);
        }
    }
}
