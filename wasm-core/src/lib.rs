use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn matmul(a: &[f64], a_rows: usize, a_cols: usize, b: &[f64], b_cols: usize) -> Vec<f64> {
    if a.len() != a_rows * a_cols || b.len() != a_cols * b_cols { return vec![]; }
    let mut out = vec![0.0; a_rows * b_cols];
    for i in 0..a_rows {
        for k in 0..a_cols {
            let aik = a[i * a_cols + k];
            for j in 0..b_cols { out[i * b_cols + j] += aik * b[k * b_cols + j]; }
        }
    }
    out
}

#[wasm_bindgen]
pub fn rk4_decay(k: f64, y0: f64, t_max: f64, n_points: usize) -> Vec<f64> {
    let n = n_points.max(2);
    let dt = t_max / (n as f64 - 1.0);
    let mut y = Vec::with_capacity(n);
    let mut current = y0;
    for _ in 0..n {
        y.push(current);
        let f = |v: f64| -k * v;
        let k1 = f(current);
        let k2 = f(current + dt * k1 / 2.0);
        let k3 = f(current + dt * k2 / 2.0);
        let k4 = f(current + dt * k3);
        current += dt * (k1 + 2.0*k2 + 2.0*k3 + k4) / 6.0;
    }
    y
}

#[wasm_bindgen]
pub fn heat1d(alpha: f64, length: f64, t_max: f64, nx: usize, snapshots: usize) -> Vec<f64> {
    let nx = nx.max(3);
    let snapshots = snapshots.max(2);
    let dx = length / (nx as f64 - 1.0);
    let stable_dt = 0.45 * dx * dx / alpha.max(1e-12);
    let total_steps = (t_max / stable_dt).ceil().max(1.0) as usize;
    let dt = t_max / total_steps as f64;
    let r = alpha * dt / (dx * dx);
    let mut u = vec![0.0; nx];
    for i in 0..nx {
        let x = i as f64 * dx;
        u[i] = (std::f64::consts::PI * x / length).sin();
    }
    let mut out = Vec::with_capacity(nx * snapshots);
    let stride = (total_steps / (snapshots - 1)).max(1);
    out.extend_from_slice(&u);
    let mut next = u.clone();
    let mut written = 1usize;
    for step in 1..=total_steps {
        for i in 1..nx-1 { next[i] = u[i] + r * (u[i-1] - 2.0*u[i] + u[i+1]); }
        next[0] = 0.0; next[nx-1] = 0.0;
        std::mem::swap(&mut u, &mut next);
        if (step % stride == 0 || step == total_steps) && written < snapshots {
            out.extend_from_slice(&u);
            written += 1;
        }
    }
    while written < snapshots { out.extend_from_slice(&u); written += 1; }
    out
}
