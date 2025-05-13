<%@ page session="true" %>
<!DOCTYPE html>
<html>
<head>
    <title>Add Transaction</title>
    <style>
        body {
            background: linear-gradient(to right, #f0f4f8, #d9e2ec);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #2c3e50;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }

        .container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }

        .form-container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            width: 350px;
            text-align: center;
            margin-right: 20px; /* Space between form and image */
        }

        h2 {
            margin-bottom: 30px;
            color: rgb(60, 158, 153);
        }

        label, select, input {
            display: block;
            width: 100%;
            margin-bottom: 15px;
            font-size: 16px;
        }

        input[type="number"], input[type="text"], select {
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
        }

        input[type="submit"] {
            background-color: rgb(60, 158, 153);
            color: white;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        input[type="submit"]:hover {
            background-color: rgb(60, 158, 153);
        }

        .image-container {
            width: 400px; /* Adjust width of image container */
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .image-container img {
            width: 100%;
            height: auto;
            border-radius: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="form-container">
            <h2>Add Transaction</h2>
            <form method="post" action="addTransaction">
                <label for="type"><b>Type</b>:</label>
                <select name="type" id="type">
                    <option value="income"><b>Income</b></option>
                    <option value="expense"><b>Expense</b></option>
                </select>

                <label for="amount"><b>Amount</b></label>
                <input type="number" name="amount" id="amount" step="0.01" required>

                <label for="description"><b>Description</b>:</label>
                <input type="text" name="description" id="description">

                <input type="submit" value="Add">
            </form>
        </div>

        <!-- Image Section -->
        <div class="image-container">
            <img src="add.png" alt="Image" /> <!-- Add the image path here -->
        </div>
    </div>
</body>
</html>
