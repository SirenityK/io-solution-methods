# Transportation Problem Solver for MicroPython / Casio calculators
# Methods: Northwest Corner, Least Cost, Vogel Approximation, MODI optimization
# Avoids imports/f-strings to stay compatible with small MicroPython builds.


def ask_int(msg):
    while True:
        try:
            return int(input(msg))
        except:
            print("Invalid integer.")


def print_line():
    print("------------------------------")


def print_matrix(cost, supply, demand, alloc, basic):
    m = len(supply)
    n = len(demand)
    print("TABLE: cost/allocation")
    head = "      "
    for j in range(n):
        head += " D" + str(j + 1) + "     "
    head += " Supply"
    print(head)
    for i in range(m):
        row = "O" + str(i + 1) + "  "
        for j in range(n):
            a = "-"
            if basic[i][j]:
                a = str(alloc[i][j])
            row += str(cost[i][j]) + "/" + a + "   "
        row += str(supply[i])
        print(row)
    dem = "Dem  "
    for j in range(n):
        dem += str(demand[j]) + "      "
    print(dem)


def total_cost(cost, alloc):
    s = 0
    for i in range(len(alloc)):
        for j in range(len(alloc[0])):
            s += cost[i][j] * alloc[i][j]
    return s


def count_basic(basic):
    c = 0
    for i in range(len(basic)):
        for j in range(len(basic[0])):
            if basic[i][j]:
                c += 1
    return c


def clone_vec(v):
    r = []
    for x in v:
        r.append(x)
    return r


def make_zero_matrix(m, n):
    a = []
    for i in range(m):
        row = []
        for j in range(n):
            row.append(0)
        a.append(row)
    return a


def balance_problem(cost, supply, demand):
    ts = 0
    td = 0
    for x in supply:
        ts += x
    for x in demand:
        td += x
    if ts == td:
        return
    if ts < td:
        print("Unbalanced: adding dummy origin with supply " + str(td - ts))
        row = []
        for j in range(len(demand)):
            row.append(0)
        cost.append(row)
        supply.append(td - ts)
    else:
        print("Unbalanced: adding dummy destination with demand " + str(ts - td))
        for i in range(len(cost)):
            cost[i].append(0)
        demand.append(ts - td)


def read_problem():
    m = ask_int("Origins: ")
    n = ask_int("Destinations: ")
    cost = []
    print("Enter costs row by row.")
    for i in range(m):
        row = []
        for j in range(n):
            row.append(ask_int("c[" + str(i + 1) + "][" + str(j + 1) + "]: "))
        cost.append(row)
    supply = []
    print("Enter supplies.")
    for i in range(m):
        supply.append(ask_int("s[" + str(i + 1) + "]: "))
    demand = []
    print("Enter demands.")
    for j in range(n):
        demand.append(ask_int("d[" + str(j + 1) + "]: "))
    balance_problem(cost, supply, demand)
    return cost, supply, demand


def load_class_example():
    cost = [[8, 6, 10], [9, 7, 4], [3, 4, 2]]
    supply = [100, 120, 80]
    demand = [150, 80, 70]
    return cost, supply, demand


def find_cycle(basic, si, sj):
    m = len(basic)
    n = len(basic[0])
    path = [(si, sj)]

    def in_path(i, j):
        for p in path:
            if p[0] == i and p[1] == j:
                return True
        return False

    def dfs(i, j, direction):
        if direction == 0:  # row move
            k = 0
            while k < n:
                if k != j:
                    if i == si and k == sj and len(path) >= 4:
                        return True
                    if basic[i][k] and not in_path(i, k):
                        path.append((i, k))
                        if dfs(i, k, 1):
                            return True
                        path.pop()
                k += 1
        else:  # column move
            k = 0
            while k < m:
                if k != i:
                    if k == si and j == sj and len(path) >= 4:
                        return True
                    if basic[k][j] and not in_path(k, j):
                        path.append((k, j))
                        if dfs(k, j, 0):
                            return True
                        path.pop()
                k += 1
        return False

    if dfs(si, sj, 0):
        return path
    path[:] = [(si, sj)]
    if dfs(si, sj, 1):
        return path
    return None


def add_degenerate_zeros(basic, alloc):
    m = len(basic)
    n = len(basic[0])
    need = m + n - 1
    while count_basic(basic) < need:
        added = False
        for i in range(m):
            if added:
                break
            for j in range(n):
                if not basic[i][j]:
                    if find_cycle(basic, i, j) is None:
                        basic[i][j] = True
                        alloc[i][j] = 0
                        print(
                            "Degenerate solution: add zero allocation at O"
                            + str(i + 1)
                            + "-D"
                            + str(j + 1)
                        )
                        added = True
                        break
        if not added:
            return


def northwest_corner_method(cost, supply, demand, verbose):
    m = len(supply)
    n = len(demand)
    s = clone_vec(supply)
    d = clone_vec(demand)
    alloc = make_zero_matrix(m, n)
    basic = make_zero_matrix(m, n)
    i = 0
    j = 0
    step = 1

    if verbose:
        print_line()
        print("NORTHWEST CORNER METHOD")
        print("Start at the upper-left available cell: O1-D1.")

    while i < m and j < n:
        x = s[i]
        if d[j] < x:
            x = d[j]
        alloc[i][j] = x
        basic[i][j] = True

        if verbose:
            print(
                "Step "
                + str(step)
                + ": current northwest cell is O"
                + str(i + 1)
                + "-D"
                + str(j + 1)
            )
            print(
                "Assign min(supply,demand) = min("
                + str(s[i])
                + ","
                + str(d[j])
                + ") = "
                + str(x)
            )

        s[i] -= x
        d[j] -= x

        if s[i] == 0 and d[j] == 0:
            if verbose:
                print(
                    "Origin O"
                    + str(i + 1)
                    + " exhausted and destination D"
                    + str(j + 1)
                    + " satisfied."
                )
                print("Move diagonally to the next row and next column.")
            i += 1
            j += 1
        elif s[i] == 0:
            if verbose:
                print("Origin O" + str(i + 1) + " exhausted. Move down to next origin.")
            i += 1
        else:
            if verbose:
                print(
                    "Destination D"
                    + str(j + 1)
                    + " satisfied. Move right to next destination."
                )
            j += 1
        step += 1

    add_degenerate_zeros(basic, alloc)
    if verbose:
        print("Total cost = " + str(total_cost(cost, alloc)))
    return alloc, basic


def least_cost_method(cost, supply, demand, verbose):
    m = len(supply)
    n = len(demand)
    s = clone_vec(supply)
    d = clone_vec(demand)
    alloc = make_zero_matrix(m, n)
    basic = make_zero_matrix(m, n)
    active_r = []
    active_c = []
    for i in range(m):
        active_r.append(True)
    for j in range(n):
        active_c.append(True)

    if verbose:
        print_line()
        print("LEAST COST METHOD")
    step = 1
    while True:
        minc = None
        bi = -1
        bj = -1
        for i in range(m):
            if active_r[i]:
                for j in range(n):
                    if active_c[j]:
                        if minc is None or cost[i][j] < minc:
                            minc = cost[i][j]
                            bi = i
                            bj = j
        if bi < 0:
            break
        x = s[bi]
        if d[bj] < x:
            x = d[bj]
        alloc[bi][bj] = x
        basic[bi][bj] = True
        if verbose:
            print(
                "Step "
                + str(step)
                + ": lowest cost is "
                + str(minc)
                + " at O"
                + str(bi + 1)
                + "-D"
                + str(bj + 1)
            )
            print("Assign min(supply,demand) = " + str(x))
        s[bi] -= x
        d[bj] -= x
        if s[bi] == 0:
            active_r[bi] = False
            if verbose:
                print("Origin O" + str(bi + 1) + " exhausted.")
        if d[bj] == 0:
            active_c[bj] = False
            if verbose:
                print("Destination D" + str(bj + 1) + " satisfied.")
        step += 1
    add_degenerate_zeros(basic, alloc)
    if verbose:
        print("Total cost = " + str(total_cost(cost, alloc)))
    return alloc, basic


def two_smallest_penalty(cost, active_r, active_c, is_row, idx):
    first = None
    second = None
    pos = -1
    if is_row:
        for j in range(len(active_c)):
            if active_c[j]:
                v = cost[idx][j]
                if first is None or v < first:
                    second = first
                    first = v
                    pos = j
                elif second is None or v < second:
                    second = v
    else:
        for i in range(len(active_r)):
            if active_r[i]:
                v = cost[i][idx]
                if first is None or v < first:
                    second = first
                    first = v
                    pos = i
                elif second is None or v < second:
                    second = v
    if first is None:
        return -1, -1, -1
    if second is None:
        return first, first, pos
    return second - first, first, pos


def vogel_method(cost, supply, demand, verbose):
    m = len(supply)
    n = len(demand)
    s = clone_vec(supply)
    d = clone_vec(demand)
    alloc = make_zero_matrix(m, n)
    basic = make_zero_matrix(m, n)
    active_r = []
    active_c = []
    for i in range(m):
        active_r.append(True)
    for j in range(n):
        active_c.append(True)

    if verbose:
        print_line()
        print("VOGEL APPROXIMATION METHOD")
    step = 1
    while True:
        best_is_row = True
        best_idx = -1
        best_pen = -1
        best_min = 0
        active_count = 0
        for i in range(m):
            if active_r[i]:
                active_count += 1
                pen, mn, pos = two_smallest_penalty(cost, active_r, active_c, True, i)
                if verbose:
                    print("Row O" + str(i + 1) + " penalty = " + str(pen))
                if pen > best_pen or (pen == best_pen and mn < best_min):
                    best_pen = pen
                    best_min = mn
                    best_idx = i
                    best_is_row = True
        for j in range(n):
            if active_c[j]:
                active_count += 1
                pen, mn, pos = two_smallest_penalty(cost, active_r, active_c, False, j)
                if verbose:
                    print("Column D" + str(j + 1) + " penalty = " + str(pen))
                if pen > best_pen or (pen == best_pen and mn < best_min):
                    best_pen = pen
                    best_min = mn
                    best_idx = j
                    best_is_row = False
        if active_count == 0 or best_idx < 0:
            break

        if best_is_row:
            bi = best_idx
            bj = -1
            minc = None
            for j in range(n):
                if active_c[j]:
                    if minc is None or cost[bi][j] < minc:
                        minc = cost[bi][j]
                        bj = j
            if verbose:
                print(
                    "Step "
                    + str(step)
                    + ": choose row O"
                    + str(bi + 1)
                    + " with max penalty "
                    + str(best_pen)
                )
        else:
            bj = best_idx
            bi = -1
            minc = None
            for i in range(m):
                if active_r[i]:
                    if minc is None or cost[i][bj] < minc:
                        minc = cost[i][bj]
                        bi = i
            if verbose:
                print(
                    "Step "
                    + str(step)
                    + ": choose column D"
                    + str(bj + 1)
                    + " with max penalty "
                    + str(best_pen)
                )

        x = s[bi]
        if d[bj] < x:
            x = d[bj]
        alloc[bi][bj] = x
        basic[bi][bj] = True
        if verbose:
            print(
                "Lowest cost in chosen line is "
                + str(minc)
                + " at O"
                + str(bi + 1)
                + "-D"
                + str(bj + 1)
            )
            print("Assign " + str(x))
        s[bi] -= x
        d[bj] -= x
        if s[bi] == 0:
            active_r[bi] = False
            if verbose:
                print("Origin O" + str(bi + 1) + " exhausted.")
        if d[bj] == 0:
            active_c[bj] = False
            if verbose:
                print("Destination D" + str(bj + 1) + " satisfied.")
        step += 1
    add_degenerate_zeros(basic, alloc)
    if verbose:
        print("Total cost = " + str(total_cost(cost, alloc)))
    return alloc, basic


def modi_potentials(cost, basic):
    m = len(basic)
    n = len(basic[0])
    u = []
    v = []
    for i in range(m):
        u.append(None)
    for j in range(n):
        v.append(None)
    u[0] = 0
    changed = True
    while changed:
        changed = False
        for i in range(m):
            for j in range(n):
                if basic[i][j]:
                    if u[i] is not None and v[j] is None:
                        v[j] = cost[i][j] - u[i]
                        changed = True
                    elif v[j] is not None and u[i] is None:
                        u[i] = cost[i][j] - v[j]
                        changed = True
        if not changed:
            for i in range(m):
                if u[i] is None:
                    u[i] = 0
                    changed = True
                    break
            if not changed:
                for j in range(n):
                    if v[j] is None:
                        v[j] = 0
                        changed = True
                        break
    return u, v


def modi_method(cost, supply, demand, initial):
    if initial == 1:
        alloc, basic = northwest_corner_method(cost, supply, demand, True)
    elif initial == 2:
        alloc, basic = least_cost_method(cost, supply, demand, True)
    else:
        alloc, basic = vogel_method(cost, supply, demand, True)

    print_line()
    print("MODI OPTIMIZATION")
    m = len(supply)
    n = len(demand)
    it = 1
    while True:
        add_degenerate_zeros(basic, alloc)
        print_line()
        print("MODI iteration " + str(it))
        u, v = modi_potentials(cost, basic)
        print("Potentials u and v from basic cells: c_ij = u_i + v_j")
        print("u = " + str(u))
        print("v = " + str(v))

        best_delta = 0
        ei = -1
        ej = -1
        for i in range(m):
            for j in range(n):
                if not basic[i][j]:
                    delta = cost[i][j] - u[i] - v[j]
                    print(
                        "Opportunity cost O"
                        + str(i + 1)
                        + "-D"
                        + str(j + 1)
                        + " = "
                        + str(delta)
                    )
                    if delta < best_delta:
                        best_delta = delta
                        ei = i
                        ej = j
        if ei < 0:
            print("All opportunity costs are >= 0. Solution is optimal.")
            print("Optimal total cost = " + str(total_cost(cost, alloc)))
            return alloc, basic

        print(
            "Most negative opportunity cost: O"
            + str(ei + 1)
            + "-D"
            + str(ej + 1)
            + " = "
            + str(best_delta)
        )
        print("Enter this cell and form a closed loop with + and - signs.")
        cyc = find_cycle(basic, ei, ej)
        if cyc is None:
            print("Error: no closed loop found. Check degeneracy handling.")
            return alloc, basic

        s = "Loop: "
        for k in range(len(cyc)):
            sign = "+" if k % 2 == 0 else "-"
            s += sign + "O" + str(cyc[k][0] + 1) + "D" + str(cyc[k][1] + 1) + " "
        print(s)

        theta = None
        k = 1
        while k < len(cyc):
            i = cyc[k][0]
            j = cyc[k][1]
            if theta is None or alloc[i][j] < theta:
                theta = alloc[i][j]
            k += 2
        print("Theta = minimum allocation in minus cells = " + str(theta))

        basic[ei][ej] = True
        remove_i = -1
        remove_j = -1
        for k in range(len(cyc)):
            i = cyc[k][0]
            j = cyc[k][1]
            if k % 2 == 0:
                alloc[i][j] += theta
            else:
                alloc[i][j] -= theta
                if alloc[i][j] == 0 and remove_i < 0:
                    remove_i = i
                    remove_j = j
        if remove_i >= 0:
            basic[remove_i][remove_j] = False
            print("Leaving cell: O" + str(remove_i + 1) + "-D" + str(remove_j + 1))
        print("New total cost = " + str(total_cost(cost, alloc)))
        it += 1


def solve_all_for_report(cost, supply, demand):
    nw_alloc, nw_basic = northwest_corner_method(cost, supply, demand, True)
    print_matrix(cost, supply, demand, nw_alloc, nw_basic)
    nw_cost = total_cost(cost, nw_alloc)

    lc_alloc, lc_basic = least_cost_method(cost, supply, demand, True)
    print_matrix(cost, supply, demand, lc_alloc, lc_basic)
    lc_cost = total_cost(cost, lc_alloc)

    vg_alloc, vg_basic = vogel_method(cost, supply, demand, True)
    print_matrix(cost, supply, demand, vg_alloc, vg_basic)
    vg_cost = total_cost(cost, vg_alloc)

    op_alloc, op_basic = modi_method(cost, supply, demand, 3)
    print_matrix(cost, supply, demand, op_alloc, op_basic)
    op_cost = total_cost(cost, op_alloc)

    print_line()
    print("SUMMARY")
    print("Northwest Corner = " + str(nw_cost))
    print("Least Cost = " + str(lc_cost))
    print("Vogel = " + str(vg_cost))
    print("MODI optimal = " + str(op_cost))
    print("Northwest -> Least Cost reduction = " + str(nw_cost - lc_cost))
    print("Least Cost -> Vogel reduction = " + str(lc_cost - vg_cost))
    print("Vogel -> MODI reduction = " + str(vg_cost - op_cost))


def main():
    print("Transportation Solver")
    print("1) Enter my own table")
    print("2) Use class example")
    ch = ask_int("Choice: ")
    if ch == 2:
        cost, supply, demand = load_class_example()
    else:
        cost, supply, demand = read_problem()

    print_line()
    print("Methods:")
    print("1) Northwest Corner")
    print("2) Least Cost")
    print("3) Vogel")
    print("4) MODI optimization")
    print("5) Run all")
    method = ask_int("Choice: ")

    if method == 1:
        alloc, basic = northwest_corner_method(cost, supply, demand, True)
        print_matrix(cost, supply, demand, alloc, basic)
        print("Total cost = " + str(total_cost(cost, alloc)))
    elif method == 2:
        alloc, basic = least_cost_method(cost, supply, demand, True)
        print_matrix(cost, supply, demand, alloc, basic)
        print("Total cost = " + str(total_cost(cost, alloc)))
    elif method == 3:
        alloc, basic = vogel_method(cost, supply, demand, True)
        print_matrix(cost, supply, demand, alloc, basic)
        print("Total cost = " + str(total_cost(cost, alloc)))
    elif method == 4:
        print("Initial solution for MODI:")
        print("1) Northwest Corner")
        print("2) Least Cost")
        print("3) Vogel")
        initial = ask_int("Choice: ")
        alloc, basic = modi_method(cost, supply, demand, initial)
        print_matrix(cost, supply, demand, alloc, basic)
        print("Final cost = " + str(total_cost(cost, alloc)))
    else:
        solve_all_for_report(cost, supply, demand)


main()
