<%@ page contentType="text/html; charset=UTF-8" language="java" %>
<%@ page import="helper.DBConnection" %>
<%@ page import="java.sql.*" %>
<%
    String username = (String) session.getAttribute("username");
    if (username == null) {
        response.sendRedirect("login.html");
        return;
    }

    Connection conn = DBConnection.getConnection();

    // Handle DELETE
    String deleteId = request.getParameter("deleteId");
    if (deleteId != null) {
        PreparedStatement delStmt = conn.prepareStatement("DELETE FROM transactions WHERE id = ? AND username = ?");
        delStmt.setInt(1, Integer.parseInt(deleteId));
        delStmt.setString(2, username);
        delStmt.executeUpdate();
    }

    // Handle UPDATE
    String updateId = request.getParameter("updateId");
    if (updateId != null && request.getParameter("amount") != null) {
        PreparedStatement updateStmt = conn.prepareStatement("UPDATE transactions SET type=?, amount=?, description=? WHERE id=? AND username=?");
        updateStmt.setString(1, request.getParameter("type"));
        updateStmt.setDouble(2, Double.parseDouble(request.getParameter("amount")));
        updateStmt.setString(3, request.getParameter("description"));
        updateStmt.setInt(4, Integer.parseInt(updateId));
        updateStmt.setString(5, username);
        updateStmt.executeUpdate();
    }
%>

<!DOCTYPE html>
<html>
<head>
    <title>View Transactions</title>
    <style>
        body {
            background: linear-gradient(to right, #f0f4f8, #d9e2ec);
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #fff;
        }

        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: rgb(60, 158, 153); /* Updated color */
        }

        table {
            width: 95%;
            margin: auto;
            background: #fff;
            color: #333;
            border-collapse: collapse;
            border-radius: 10px;
            overflow: hidden;
        }

        th, td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            text-align: center;
        }

        th {
            background-color: rgb(60, 158, 153);
            color: white;
        }

        tr:hover {
            background-color: #f1f1f1;
        }

        .btn {
            padding: 5px 10px;
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
        }

        .edit-btn { background-color: #f39c12; }
        .delete-btn { background-color: #e74c3c; }
        .save-btn { background-color: #27ae60; }

        .totals {
            text-align: center;
            margin-top: 25px;
            font-size: 18px;
            color: black; /* Updated color */
        }
    </style>
</head>
<body>

<h1>Your Transactions</h1>
<table>
    <tr>
        <th>Type</th>
        <th>Amount</th>
        <th>Description</th>
        <th>Date</th>
        <th>Actions</th>
    </tr>
    <%
        double totalIncome = 0, totalExpense = 0;
        String editId = request.getParameter("editId");

        PreparedStatement ps = conn.prepareStatement("SELECT * FROM transactions WHERE username=? ORDER BY date DESC");
        ps.setString(1, username);
        ResultSet rs = ps.executeQuery();

        while (rs.next()) {
            int id = rs.getInt("id");
            String type = rs.getString("type");
            double amount = rs.getDouble("amount");
            String desc = rs.getString("description");
            Date date = rs.getDate("date");

            if ("income".equalsIgnoreCase(type)) totalIncome += amount;
            else totalExpense += amount;

            if (editId != null && editId.equals(String.valueOf(id))) {
    %>
    <form method="post">
        <tr>
            <td>
                <select name="type">
                    <option value="income" <%= "income".equals(type) ? "selected" : "" %>>Income</option>
                    <option value="expense" <%= "expense".equals(type) ? "selected" : "" %>>Expense</option>
                </select>
            </td>
            <td><input type="number" name="amount" value="<%= amount %>" step="0.01" required></td>
            <td><input type="text" name="description" value="<%= desc %>"></td>
            <td><%= date %></td>
            <td>
                <input type="hidden" name="updateId" value="<%= id %>">
                <input class="btn save-btn" type="submit" value="Save">
                <a class="btn delete-btn" href="viewTransactions.jsp">Cancel</a>
            </td>
        </tr>
    </form>
    <% } else { %>
    <tr>
        <td><%= type %></td>
        <td><%= amount %></td>
        <td><%= desc %></td>
        <td><%= date %></td>
        <td>
            <a class="btn edit-btn" href="viewTransactions.jsp?editId=<%= id %>">Edit</a>
            <a class="btn delete-btn" href="viewTransactions.jsp?deleteId=<%= id %>" onclick="return confirm('Delete this transaction?')">Delete</a>
        </td>
    </tr>
    <% } } %>
</table>

<div class="totals">
    <p><strong>Total Income:</strong> ₹<%= totalIncome %></p>
    <p><strong>Total Expense:</strong> ₹<%= totalExpense %></p>
    <p><strong>Balance:</strong> ₹<%= totalIncome - totalExpense %></p>
</div>

</body>
</html>
