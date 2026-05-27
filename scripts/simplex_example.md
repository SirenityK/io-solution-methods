# Tutorial: The Simplex Method (Step-by-Step)

The Simplex Method is an algebraic, iterative procedure used to solve linear programming problems. This tutorial walks you through optimizing an objective function subject to several constraints using a matrix called a **tableau**.

### The Sample Problem

- **Maximize:** $P = 30x + 40y$
- **Subject to constraints:**
  1. $2x + y \le 10$
  2. $x + y \le 7$
  3. $x + 2y \le 12$
  4. Non-negativity condition: $x \ge 0, y \ge 0$

---

## Step 1: Introduce Slack Variables and Rewrite Equations

To convert inequalities into equations that can be entered into a matrix, we add a unique **slack variable** ($s_1, s_2, s_3$) to each constraint to pick up the "slack" between the left and right sides.

- $2x + y + s_1 = 10$
- $x + y + s_2 = 7$
- $x + 2y + s_3 = 12$

Next, rewrite the objective function so all variables are on the left side (by subtracting $30x$ and $40y$ from both sides):

- $-30x - 40y + P = 0$

---

## Step 2: Set Up the Initial Tableau

We arrange the coefficients of our rewritten system into a matrix called an initial simplex tableau. The columns represent our variables ($x, y, s_1, s_2, s_3, P$) and the final column holds the constants ($B$).

|   $x$   |   $y$   | $s_1$ | $s_2$ | $s_3$ |  $P$  |  $B$  |
| :-----: | :-----: | :---: | :---: | :---: | :---: | :---: |
|    2    |    1    |   1   |   0   |   0   |   0   |  10   |
|    1    |    1    |   0   |   1   |   0   |   0   |   7   |
|    1    |    2    |   0   |   0   |   1   |   0   |  12   |
| **-30** | **-40** | **0** | **0** | **0** | **1** | **0** |

---

## Step 3: First Iteration – Find Pivot & Row Operations

1. **Identify the Pivot Column:** Look at the bottom row (objective function) and locate the most negative value. This is **$-40$** in the $y$-column. The $y$-column becomes our pivot column.
2. **Identify the Pivot Element:** Divide each constant in the right-hand column ($B$) by its corresponding positive value in the pivot column:
   - Row 1: $10 / 1 = 10$
   - Row 2: $7 / 1 = 7$
   - Row 3: $12 / 2 = 6$

   The smallest positive quotient is $6$ (from Row 3). Therefore, the element **$2$** in Row 3, Column 2 is our **pivot element**.

3. **Normalize the Pivot Row:** To make the pivot element a $1$, divide all values in Row 3 by $2$:
   - New Row 3: $\begin{bmatrix} 1/2 & 1 & 0 & 0 & 1/2 & 0 & 6 \end{bmatrix}$

4. **Clear the Pivot Column:** Use Row 3 to make all other values in the $y$-column equal to $0$ via row operations:
   - **Row 1 becomes $R_1 - R_3$**
   - **Row 2 becomes $R_2 - R_3$**
   - **Row 4 becomes $40R_3 + R_4$**

After computing these row operations, your updated tableau looks like this:

|   $x$   |  $y$  | $s_1$ | $s_2$ | $s_3$  |  $P$  |   $B$   |
| :-----: | :---: | :---: | :---: | :----: | :---: | :-----: |
|   3/2   |   0   |   1   |   0   |  -1/2  |   0   |    4    |
|   1/2   |   0   |   0   |   1   |  -1/2  |   0   |    1    |
|   1/2   |   1   |   0   |   0   |  1/2   |   0   |    6    |
| **-10** | **0** | **0** | **0** | **20** | **1** | **240** |

---

## Step 4: Second Iteration – Repeat the Process

Because there is still a negative value ($-\mathbf{10}$) in the bottom row, the problem is not yet optimized. We must repeat the process.

1. **New Pivot Column:** The $x$-column (containing $-10$).
2. **New Pivot Element:** Divide the constants by the positive values in the new pivot column:
   - Row 1: $4 / (3/2) = 8/3 \approx 2.67$
   - Row 2: $1 / (1/2) = 2$
   - Row 3: $6 / (1/2) = 12$

   The smallest quotient is $2$, meaning the element **$1/2$** in Row 2, Column 1 is our new pivot element.

3. **Normalize the Pivot Row:** Multiply Row 2 by $2$ to make the pivot element a $1$:
   - New Row 2: $\begin{bmatrix} 1 & 0 & 0 & 2 & -1 & 0 & 2 \end{bmatrix}$
4. **Clear the Pivot Column:** Eliminate the other elements in the $x$-column using row operations:
   - **Row 1 becomes $R_1 - \frac{3}{2}R_2$**
   - **Row 3 becomes $R_3 - \frac{1}{2}R_2$**
   - **Row 4 becomes $10R_2 + R_4$**

After performing these calculations, the finalized tableau is:

|  $x$  |  $y$  | $s_1$ | $s_2$  | $s_3$  |  $P$  |   $B$   |
| :---: | :---: | :---: | :----: | :----: | :---: | :-----: |
|   0   |   0   |   1   |   -3   |   1    |   0   |    1    |
|   1   |   0   |   0   |   2    |   -1   |   0   |    2    |
|   0   |   1   |   0   |   -1   |   1    |   0   |    5    |
| **0** | **0** | **0** | **20** | **10** | **1** | **260** |

---

## Step 5: Read the Final Solution

Look at the bottom row. Since there are no longer any negative indicators, optimization is complete.

Variables that form an identity matrix column (columns with a single $1$ and all other entries as $0$) are **basic variables**. Their value is read directly from the right-hand column ($B$). All other variables are **non-basic** and are set to $0$.

- **Basic Variables:**
  - Column $x$ has a $1$ in Row 2 $\rightarrow$ **$x = 2$**
  - Column $y$ has a $1$ in Row 3 $\rightarrow$ **$y = 5$**
  - Column $s_1$ has a $1$ in Row 1 $\rightarrow$ **$s_1 = 1$**
  - Column $P$ has a $1$ in Row 4 $\rightarrow$ **$P = 260$**
- **Non-Basic Variables:**
  - Columns $s_2$ and $s_3$ do not fit the criteria $\rightarrow$ **$s_2 = 0, s_3 = 0$**

### Final Conclusion

The objective function $P$ reaches its maximum value of **$260$** when **$x = 2$** and **$y = 5$**.
