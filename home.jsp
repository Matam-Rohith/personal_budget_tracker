<%@ page session="true" %>
<!DOCTYPE html>
<html>
<head>
    <title>Home</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            height: 100vh;
            display: flex;
        }

        .left-container {
            width: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(to right, #f0f4f8, #d9e2ec);
        }

        .home-container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            text-align: center;
            width: 300px;
        }

        h2 {
            color: rgb(60, 158, 153);
            margin-bottom: 30px;
        }

        a {
            display: block;
            margin: 10px 0;
            padding: 12px;
            background-color: rgb(60, 158, 153);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            transition: background-color 0.3s ease;
        }

        a:hover {
            background-color: rgb(50, 140, 135);
        }

        .right-container {
            width: 50%;
            background-color: #eaf1f8;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .right-container img {
            width: 80%;
            max-width: 500px;
            height: auto;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div class="left-container">
        <div class="home-container">
            <h2>Welcome, <%= session.getAttribute("username") %>!</h2>
            <a href="addTransaction.jsp">➕ Add Transaction</a>
            <a href="viewTransactions.jsp">📄 View Transactions</a>
        </div>
    </div>
    <div class="right-container">
        <img src="home1.png" alt="Home Image">
    </div>
</body>
</html>
