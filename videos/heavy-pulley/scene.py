"""Heavy pulley (Atwood machine) — find I from a stopwatch reading.

3b1b-style Manim CE scene on a creme background. Screen text is English;
the voice-over is Hindi (see narration.py / make_voice.py).

    manim -qh scene.py HeavyPulley
"""

import json
import os
from contextlib import contextmanager
from pathlib import Path

import numpy as np
from manim import *

from narration import TEXT

HERE = Path(__file__).resolve().parent
AUDIO = HERE / "audio"
SNAP_DIR = os.environ.get("SNAP_DIR")
MANIFEST = json.loads((AUDIO / "manifest.json").read_text()) if (AUDIO / "manifest.json").exists() else {}

# ---------------------------------------------------------------- palette
BG = "#FBF4E6"
INK = "#23262F"
SOFT = "#7A7163"
RED_C = "#C0392B"      # heavier mass, T1
BLUE_C = "#2471A3"     # lighter mass, T2
GREEN_C = "#1E8449"    # acceleration
PURPLE_C = "#7D3C98"   # pulley, I
GOLD_C = "#B9770E"     # results
PULLEY_FILL = "#E6DAEF"

config.background_color = BG
MathTex.set_default(color=INK)
Tex.set_default(color=INK)

# ---------------------------------------------------------------- physics
R_M, M1, M2, S_M, T_S, G = 0.02, 0.40, 0.35, 0.81, 9.0, 9.8
A = 2 * S_M / T_S**2                     # 0.02 m/s^2
A0 = (M1 - M2) * G / (M1 + M2)           # massless-pulley value
T_MASSLESS = np.sqrt(2 * S_M / A0)       # ~1.57 s
I_ANS = R_M**2 * ((M1 - M2) * G / A - (M1 + M2))
assert abs(I_ANS - 9.5e-3) < 1e-9

# ---------------------------------------------------------------- layout
PC = np.array([-4.4, 2.35, 0])  # pulley centre
PR = 0.75                       # pulley radius on screen
K = 3.0                         # screen units per metre of string
X1, X2 = PC[0] - PR, PC[0] + PR
Y1_TOP, Y2_TOP = 0.35, -1.45    # initial tops of the two blocks
RX = 2.9                        # centre of the right-hand panel
FS = 40                         # default equation size


def clip_path(key):
    path = AUDIO / f"{key}.flac"
    return path if path.exists() else None


def clip_duration(key):
    if clip_path(key) and key in MANIFEST:
        return MANIFEST[key]["duration"]
    return 0.075 * len(TEXT[key].split()) + 1.0  # rough guess for silent previews


def eq(*parts, fs=FS, **kw):
    return MathTex(*parts, font_size=fs, **kw)


def txt(s, fs=34, color=INK):
    return Tex(s, font_size=fs, color=color)


def hatch_ceiling(x0, x1, y):
    line = Line([x0, y, 0], [x1, y, 0], color=INK, stroke_width=4)
    marks = VGroup(*[
        Line([x, y, 0], [x + 0.18, y + 0.18, 0], color=INK, stroke_width=2)
        for x in np.arange(x0, x1, 0.2)
    ])
    return VGroup(line, marks)


def block(w, h, fill, sym, mass_label):
    box = RoundedRectangle(width=w, height=h, corner_radius=0.08, stroke_color=INK,
                           stroke_width=2.5, fill_color=fill, fill_opacity=1)
    s = eq(sym, fs=34, color=WHITE)
    lab = txt(mass_label, fs=20, color=WHITE)
    VGroup(s, lab).arrange(DOWN, buff=0.06).move_to(box)
    return VGroup(box, s, lab)


def force_arrow(start, vec, color, label=None, label_dir=RIGHT, fs=30):
    arr = Arrow(start, start + vec, buff=0, color=color, stroke_width=5,
                max_tip_length_to_length_ratio=0.3, max_stroke_width_to_length_ratio=20, tip_length=0.2)
    if label is None:
        return VGroup(arr)
    lab = eq(label, fs=fs, color=color).next_to(arr, label_dir, buff=0.1)
    return VGroup(arr, lab)


class Atwood(VGroup):
    """The pulley, string and two blocks, driven by self.s (metres of string moved)."""

    def __init__(self):
        super().__init__()
        self.s = ValueTracker(0)
        self.ceiling = hatch_ceiling(PC[0] - 1.1, PC[0] + 1.1, 3.55)
        self.support = Line([PC[0], 3.55, 0], PC, color=INK, stroke_width=4)

        disc = Circle(PR, stroke_color=PURPLE_C, stroke_width=4, fill_color=PULLEY_FILL,
                      fill_opacity=1).move_to(PC)
        groove = Circle(PR - 0.1, stroke_color=PURPLE_C, stroke_width=1.5, stroke_opacity=0.6).move_to(PC)
        spokes = VGroup(*[
            Line(PC, PC + (PR - 0.1) * np.array([np.cos(t), np.sin(t), 0]), color=PURPLE_C, stroke_width=2.5)
            for t in np.arange(0, TAU, TAU / 6)
        ])
        hub = Circle(0.1, color=INK, fill_color=INK, fill_opacity=1, stroke_width=1).move_to(PC)
        self.pulley = VGroup(disc, groove, spokes, hub)
        # a small mark on the rim makes the rotation obvious
        self.dot = Dot(PC + (PR - 0.2) * UP, radius=0.06, color=PURPLE_C)
        self.wheel = VGroup(self.pulley, self.dot)
        self.wheel.angle = 0.0

        def spin(m):
            target = K * self.s.get_value() / PR
            m.rotate(target - m.angle, about_point=PC)
            m.angle = target

        self.wheel.add_updater(spin)

        self.wrap = Arc(radius=PR + 0.02, start_angle=0, angle=PI, arc_center=PC, color=INK, stroke_width=3)
        self.m1 = block(0.9, 0.9, RED_C, "m_1", "400 g")
        self.m2 = block(0.8, 0.8, BLUE_C, "m_2", "350 g")
        self.m1.add_updater(lambda m: m.shift([X1, self.y1_top() - 0.45, 0] - m[0].get_center()))
        self.m2.add_updater(lambda m: m.shift([X2, self.y2_top() - 0.40, 0] - m[0].get_center()))
        self.str1 = Line(PC + PR * LEFT, [X1, Y1_TOP, 0], color=INK, stroke_width=3)
        self.str2 = Line(PC + PR * RIGHT, [X2, Y2_TOP, 0], color=INK, stroke_width=3)
        self.str1.add_updater(lambda l: l.put_start_and_end_on(PC + PR * LEFT, [X1, self.y1_top(), 0]))
        self.str2.add_updater(lambda l: l.put_start_and_end_on(PC + PR * RIGHT, [X2, self.y2_top(), 0]))

        self.add(self.ceiling, self.support, self.str1, self.str2, self.wrap,
                 self.wheel, self.m1, self.m2)
        self.update()

    def y1_top(self):
        return Y1_TOP - K * self.s.get_value()

    def y2_top(self):
        return Y2_TOP + K * self.s.get_value()


class HeavyPulley(Scene):
    # ------------------------------------------------------------ helpers
    @contextmanager
    def say(self, key, pad=0.35):
        """Play the voice clip `key`; afterwards wait until it has finished."""
        dur = clip_duration(key)
        t0 = self.renderer.time
        if clip_path(key):
            self.add_sound(str(clip_path(key)))
        yield dur
        left = dur + pad - (self.renderer.time - t0)
        if left > 0.02:
            self.wait(left)
        if SNAP_DIR:  # review aid: the last frame of every narration clip
            from PIL import Image
            Path(SNAP_DIR).mkdir(parents=True, exist_ok=True)
            Image.fromarray(self.renderer.get_frame()).save(Path(SNAP_DIR) / f"{self.renderer.num_plays:03d}_{key}.png")

    def header(self, s):
        h = txt(s, fs=40).move_to([RX, 3.45, 0])
        rule = Line(LEFT, RIGHT, color=SOFT, stroke_width=1.5).set_width(h.width + 0.4).next_to(h, DOWN, buff=0.12)
        return VGroup(h, rule)

    def swap_header(self, new, old=None, run_time=0.8):
        anims = [FadeIn(new, shift=0.2 * DOWN)]
        if old is not None:
            anims.append(FadeOut(old, shift=0.2 * UP))
        self.play(*anims, run_time=run_time)
        return new

    def clear_panel(self, *keep, run_time=0.6):
        # only fade what is still on screen (parts may have been added one by one)
        on = set(self.get_mobject_family_members())
        gone = [m for m in self.panel if m not in keep and any(x in on for x in m.get_family())]
        if gone:
            self.play(*[FadeOut(m) for m in gone], run_time=run_time)
        self.panel = list(keep)

    def to_panel(self, *mobs):
        self.panel.extend(mobs)

    # ------------------------------------------------------------ story
    def construct(self):
        self.panel = []
        self.hook()
        self.given()
        self.motion()
        self.acceleration()
        self.compare()
        self.tensions()
        self.newton_masses()
        self.newton_pulley()
        self.combine()
        self.solve()
        self.check()
        self.options()
        self.recap()

    # 1. Hook
    def hook(self):
        at = self.at = Atwood()
        title = txt(r"\textbf{How heavy is this pulley?}", fs=52).move_to([RX, 3.3, 0])

        with self.say("intro_1") as d:
            self.play(Write(title), run_time=1.2)
            self.play(LaggedStart(Create(at.ceiling), Create(at.support), FadeIn(at.wheel, scale=0.8),
                                  Create(at.wrap), Create(at.str1), Create(at.str2),
                                  FadeIn(at.m1, shift=0.3 * DOWN), FadeIn(at.m2, shift=0.3 * DOWN),
                                  lag_ratio=0.25), run_time=max(1.5, d - 1.6))
            # from here on the machine lives in the scene as one group
            self.remove(*at.submobjects)
            self.add(at)

        with self.say("intro_2"):
            q = eq(r"I = \,?", fs=56, color=PURPLE_C).next_to(at.wheel, RIGHT, buff=1.6).shift(0.2 * DOWN)
            arrow = Arrow(q.get_left(), at.wheel.get_right() + 0.1 * RIGHT, buff=0.15, color=PURPLE_C, stroke_width=4)
            self.play(Write(q), GrowArrow(arrow), Indicate(at.pulley, color=PURPLE_C, scale_factor=1.08))

        with self.say("intro_3") as d:
            ruler = self.ruler_icon().move_to([3.2, -0.7, 0])
            watch = self.stopwatch_icon().move_to([3.2, -2.3, 0])
            self.wait(1.8)
            self.play(FadeIn(ruler, shift=LEFT), run_time=0.8)
            self.play(FadeIn(watch, shift=LEFT), run_time=0.8)
            self.play(Rotate(watch[-1], -TAU, about_point=watch[0].get_center()), run_time=1.5)

        self.play(FadeOut(VGroup(title, q, arrow, ruler, watch)), run_time=1.0)

    def ruler_icon(self):
        body = Rectangle(width=2.4, height=0.42, stroke_color=INK, fill_color="#F2D9A2", fill_opacity=1)
        ticks = VGroup(*[
            Line([x, 0.21, 0], [x, 0.21 - (0.2 if i % 5 == 0 else 0.1), 0], color=INK, stroke_width=1.5)
            for i, x in enumerate(np.linspace(-1.05, 1.05, 22))
        ])
        return VGroup(body, ticks)

    def stopwatch_icon(self):
        face = Circle(0.55, stroke_color=INK, stroke_width=4, fill_color=WHITE, fill_opacity=1)
        crown = RoundedRectangle(width=0.22, height=0.16, corner_radius=0.04, color=INK,
                                 fill_color=INK, fill_opacity=1).next_to(face, UP, buff=0.02)
        ticks = VGroup(*[
            Line(0.45 * np.array([np.cos(t), np.sin(t), 0]), 0.53 * np.array([np.cos(t), np.sin(t), 0]),
                 color=INK, stroke_width=2) for t in np.arange(0, TAU, TAU / 12)
        ]).move_to(face)
        hand = Line(face.get_center(), face.get_center() + 0.42 * UP, color=RED_C, stroke_width=4)
        return VGroup(face, crown, ticks, hand)

    # 2. Given data
    def given(self):
        at = self.at
        head = self.header(r"Given \;(convert to SI)")
        self.head = head

        def row(lhs, rhs, color=INK):
            l = eq(lhs, color=color)
            a = eq(r"\longrightarrow", color=SOFT)
            r = eq(rhs, color=color)
            return VGroup(l, a, r)

        rows = [
            row(r"r = 2\,\text{cm}", r"0.02\,\text{m}"),
            row(r"m_1 = 400\,\text{g}", r"0.40\,\text{kg}", RED_C),
            row(r"m_2 = 350\,\text{g}", r"0.35\,\text{kg}", BLUE_C),
            row(r"s = 81\,\text{cm}", r"0.81\,\text{m}"),
        ]
        for i, r in enumerate(rows):
            y = 2.3 - 0.75 * i
            r[0].move_to([RX - 0.55, y, 0], aligned_edge=RIGHT)
            r[1].move_to([RX, y, 0])
            r[2].move_to([RX + 0.55, y, 0], aligned_edge=LEFT)
        extra = eq(r"t = 9\,\text{s}", r",\quad", r"u = 0", r"\;\text{(from rest)}").move_to([RX, 2.3 - 0.75 * 4, 0])
        gval = eq(r"g = 9.8\,\text{m/s}^2").move_to([RX, 2.3 - 0.75 * 5, 0])
        find = eq(r"\text{Find: }", r"I", r"= \,?", color=PURPLE_C, fs=48).move_to([RX, 2.3 - 0.75 * 6 - 0.15, 0])

        radius = Line(PC, PC + PR * rotate_vector(RIGHT, -PI / 5), color=INK, stroke_width=3)
        rlab = eq("r", fs=34).next_to(radius.get_center(), DOWN + LEFT * 0.2, buff=0.08)
        rlab.add_background_rectangle(color=PULLEY_FILL, opacity=1, buff=0.03)
        self.radius = VGroup(radius, rlab)

        with self.say("given_1"):
            self.swap_header(head)
        with self.say("given_2"):
            self.play(Create(radius), Write(rlab), FadeIn(rows[0][0]), run_time=1.2)
            self.play(GrowFromCenter(rows[0][1]), FadeIn(rows[0][2], shift=0.2 * RIGHT))
        with self.say("given_3") as d:
            self.play(FadeIn(rows[1][0]), Indicate(at.m1[0], color=RED_C), run_time=1.2)
            self.play(GrowFromCenter(rows[1][1]), FadeIn(rows[1][2], shift=0.2 * RIGHT))
            self.wait(max(0.1, d / 2 - 2.4))
            self.play(FadeIn(rows[2][0]), Indicate(at.m2[0], color=BLUE_C), run_time=1.2)
            self.play(GrowFromCenter(rows[2][1]), FadeIn(rows[2][2], shift=0.2 * RIGHT))
        with self.say("given_4"):
            self.play(FadeIn(extra), run_time=1.0)
            self.wait(1.4)
            self.play(FadeIn(rows[3][0]), run_time=0.8)
            self.wait(1.2)
            self.play(GrowFromCenter(rows[3][1]), FadeIn(rows[3][2], shift=0.2 * RIGHT))
        with self.say("given_5"):
            self.play(FadeIn(gval), run_time=0.8)
            self.wait(0.8)
            self.play(Write(find))
            self.play(Circumscribe(find, color=PURPLE_C))
        self.given_table = VGroup(*rows, extra, gval, find)
        self.to_panel(self.given_table)

    # 3. Watch the motion in real time
    def motion(self):
        at = self.at
        self.clear_panel()
        head = self.header(r"Release from rest \dots")
        clock = ValueTracker(0)
        t_lab = eq(r"t =", fs=56)
        t_num = DecimalNumber(0, num_decimal_places=1, font_size=56, color=INK)
        t_unit = eq(r"\text{s}", fs=56)
        s_lab = eq(r"\text{drop} =", fs=56, color=RED_C)
        s_num = DecimalNumber(0, num_decimal_places=2, font_size=56, color=RED_C)
        s_unit = eq(r"\text{m}", fs=56, color=RED_C)
        t_row = VGroup(t_lab, t_num, t_unit).arrange(RIGHT, buff=0.2, aligned_edge=DOWN).move_to([RX, 1.6, 0])
        s_row = VGroup(s_lab, s_num, s_unit).arrange(RIGHT, buff=0.2, aligned_edge=DOWN).move_to([RX, 0.5, 0])
        t_num.add_updater(lambda m: m.set_value(clock.get_value()))
        s_num.add_updater(lambda m: m.set_value(at.s.get_value()))

        ghost1 = at.m1[0].copy().set_fill(opacity=0).set_stroke(RED_C, 2, opacity=0.6)
        ghost1 = DashedVMobject(ghost1, num_dashes=24)

        with self.say("motion_1"):
            self.head = self.swap_header(head, self.head)
            self.play(FadeIn(t_row), FadeIn(s_row), FadeIn(ghost1))

        acc1 = force_arrow(at.m1[0].get_left() + 0.35 * LEFT + 0.3 * UP, 0.8 * DOWN, GREEN_C, "a", LEFT)
        acc2 = force_arrow(at.m2[0].get_right() + 0.35 * RIGHT + 0.4 * DOWN, 0.8 * UP, GREEN_C, "a", RIGHT)
        for arr, m in ((acc1, at.m1), (acc2, at.m2)):
            off = arr.get_center() - m[0].get_center()
            arr.add_updater(lambda a, m=m, off=off: a.move_to(m[0].get_center() + off))
        with self.say("motion_2"):
            self.play(FadeIn(acc1), FadeIn(acc2), run_time=0.4)
            self.play(at.s.animate(rate_func=lambda u: u**2).set_value(S_M),
                      clock.animate(rate_func=linear).set_value(T_S), run_time=T_S)
        t_num.clear_updaters()
        s_num.clear_updaters()

        top0 = Y1_TOP
        top1 = at.y1_top()
        dim = DoubleArrow([X1 - 0.8, top0, 0], [X1 - 0.8, top1, 0], buff=0, color=RED_C, stroke_width=3,
                          tip_length=0.18)
        dim_lab = eq(r"0.81\,\text{m}", fs=30, color=RED_C).rotate(PI / 2).next_to(dim, LEFT, buff=0.08)
        slow = txt(r"Only $0.81$ m in $9$ s \;---\; \emph{very} slow!", fs=38).move_to([RX, -1.0, 0])
        clue = txt(r"This slowness is our clue.", fs=34, color=PURPLE_C).next_to(slow, DOWN, buff=0.35)
        acc1.clear_updaters()
        acc2.clear_updaters()
        with self.say("motion_3"):
            self.play(FadeOut(acc1), FadeOut(acc2), GrowFromCenter(dim), FadeIn(dim_lab))
            self.play(Write(slow))
            self.play(FadeIn(clue, shift=0.2 * UP))

        # reset the machine for the next steps
        self.play(FadeOut(VGroup(dim, dim_lab, ghost1)), at.s.animate.set_value(0), run_time=1.2)
        self.to_panel(t_row, s_row, slow, clue)
        self.clock, self.t_row, self.s_row = clock, t_row, s_row

    # 4. Step 1: acceleration
    def acceleration(self):
        self.clear_panel()
        head = self.header(r"Step 1: \; the acceleration")
        note = txt(r"String stays taut $\Rightarrow$ same $|a|$ for both, and $a$ is constant",
                   fs=30, color=SOFT).move_to([RX, 2.65, 0])
        e1 = eq(r"s", "=", r"u t", "+", r"\tfrac{1}{2} a t^2", fs=50).move_to([RX, 1.6, 0])
        with self.say("acc_1"):
            self.head = self.swap_header(head, self.head)
        with self.say("acc_2") as d:
            self.play(FadeIn(note), run_time=1.0)
            self.wait(d - 4.0)
            self.play(Write(e1), run_time=1.6)

        cross = Line(e1[2].get_corner(DL), e1[2].get_corner(UR), color=RED_C, stroke_width=4)
        u0 = eq(r"u = 0", fs=32, color=RED_C).next_to(e1[2], UP, buff=0.15)
        e2 = eq(r"s", "=", r"\tfrac{1}{2} a t^2", fs=50).move_to([RX, 0.55, 0])
        with self.say("acc_3"):
            self.play(Create(cross), FadeIn(u0, shift=0.1 * DOWN))
            self.wait(0.8)
            self.play(TransformFromCopy(VGroup(e1[0], e1[1], e1[4]), e2))

        e3 = eq(r"a", "=", r"\frac{2s}{t^2}", fs=50).move_to([RX, -0.6, 0])
        with self.say("acc_4"):
            self.play(TransformMatchingTex(e2.copy(), e3), run_time=1.3)
            self.play(e3[0].animate.set_color(GREEN_C))

        e4 = eq(r"a", "=", r"\frac{2(0.81)}{9^2}", "=", r"\frac{1.62}{81}", fs=50)
        e4.move_to([RX, -1.85, 0])
        e4[0].set_color(GREEN_C)
        with self.say("acc_5") as d:
            self.play(TransformFromCopy(e3[0:2], e4[0:2]), FadeIn(e4[2], shift=0.2 * DOWN), run_time=1.4)
            self.wait(max(0.2, d - 3.6))
            self.play(Write(e4[3:]), run_time=1.0)

        res = eq(r"a = 0.02\,\text{m/s}^2", fs=54, color=GREEN_C).move_to([RX, -3.1, 0])
        box = SurroundingRectangle(res, color=GREEN_C, buff=0.18, corner_radius=0.1)
        with self.say("acc_6"):
            self.play(Write(res))
            self.play(Create(box))

        # keep the result as a chip in the corner
        chip = VGroup(res.copy(), box.copy())
        self.play(FadeOut(VGroup(note, e1, cross, u0, e2, e3, e4)),
                  ReplacementTransform(VGroup(res, box), chip), run_time=0.8)
        self.play(chip.animate.scale(0.62).to_corner(DL, buff=0.3), run_time=0.8)
        self.a_chip = chip

    # 5. Compare with a massless pulley
    def compare(self):
        at = self.at
        head = self.header(r"What if the pulley were massless?")
        with self.say("cmp_1"):
            self.head = self.swap_header(head, self.head)

        e1 = eq(r"a_0", "=", r"\frac{(m_1 - m_2)\,g}{m_1 + m_2}", fs=50).move_to([RX, 2.2, 0])
        e1[0].set_color(GREEN_C)
        with self.say("cmp_2") as d:
            tag = txt(r"(massless pulley: same tension everywhere)", fs=28, color=SOFT).next_to(e1, DOWN, buff=0.25)
            self.play(FadeIn(tag), run_time=0.8)
            self.wait(max(0.2, d - 3.2))
            self.play(Write(e1), run_time=1.6)

        e2 = eq(r"= \frac{(0.05)(9.8)}{0.75}", r"\approx 0.65\,\text{m/s}^2", fs=46)
        e2.next_to(e1[1], DOWN, buff=1.0, aligned_edge=LEFT).shift(0.2 * LEFT)
        with self.say("cmp_3") as d:
            self.play(FadeIn(e2[0], shift=0.2 * DOWN))
            self.wait(max(0.2, d - 2.4))
            self.play(Write(e2[1]))

        # ghost run: a massless pulley covers the same 0.81 m in ~1.6 s
        clock = self.clock
        clock.set_value(0)
        t_num = DecimalNumber(0, num_decimal_places=1, font_size=44, color=INK)
        t_row = VGroup(eq(r"t =", fs=44), t_num, eq(r"\text{s}", fs=44)).arrange(RIGHT, buff=0.15, aligned_edge=DOWN)
        t_row.move_to([RX - 2.2, -1.55, 0])
        t_num.add_updater(lambda m: m.set_value(clock.get_value()))
        with self.say("cmp_4"):
            self.play(*self.pulley_fade(0.2), FadeIn(t_row), run_time=0.8)
            self.play(at.s.animate(rate_func=lambda u: u**2).set_value(S_M),
                      clock.animate(rate_func=linear).set_value(T_MASSLESS), run_time=T_MASSLESS)
        t_num.clear_updaters()
        t_num.set_value(T_MASSLESS)
        fast = txt(r"massless: \;$0.81$ m in $\approx 1.6$ s", fs=32).next_to(t_row, RIGHT, buff=0.6)
        fast.shift(0.25 * UP)
        ours = txt(r"ours: \;$0.81$ m in $9$ s", fs=32, color=PURPLE_C).next_to(fast, DOWN, buff=0.25,
                                                                              aligned_edge=LEFT)
        ratio = eq(r"\frac{a_0}{a} \approx \frac{0.65}{0.02} \approx 33", fs=46).move_to([RX, -3.05, 0])

        with self.say("cmp_5") as d:
            self.play(FadeIn(fast), at.s.animate.set_value(0), *self.pulley_fade(1), run_time=1.0)
            self.play(FadeIn(ours))
            self.play(Write(ratio))
            self.play(Indicate(at.pulley, color=PURPLE_C, scale_factor=1.1), run_time=1.2)
        self.to_panel(e1, tag, e2, t_row, fast, ours, ratio)

    def pulley_fade(self, op):
        disc, groove, spokes, hub = self.at.pulley
        return [disc.animate.set_fill(opacity=op).set_stroke(opacity=max(op, 0.4)),
                groove.animate.set_stroke(opacity=0.6 * op),
                spokes.animate.set_stroke(opacity=op),
                hub.animate.set_fill(opacity=op).set_stroke(opacity=op),
                self.at.dot.animate.set_opacity(op)]

    # 6. Why T1 != T2
    def tensions(self):
        at = self.at
        self.clear_panel()
        head = self.header(r"Step 2: \; why $T_1 \neq T_2$")
        with self.say("ten_1") as d:
            self.head = self.swap_header(head, self.head)
            # counter-clockwise: the heavy (left) side goes down
            torque = Arc(radius=PR + 0.22, start_angle=PI / 8, angle=3 * PI / 4,
                         arc_center=PC, color=PURPLE_C, stroke_width=5)
            torque.add_tip(tip_length=0.2, tip_width=0.2)
            need = txt(r"Spinning a heavy pulley needs a \emph{net torque}", fs=34).move_to([RX, 2.4, 0])
            self.play(FadeIn(need))
            self.play(Create(torque), run_time=1.2)

        light = eq(r"\text{massless pulley:}\quad", r"T_1 = T_2", fs=40).move_to([RX, 1.3, 0])
        heavy = eq(r"\text{heavy pulley:}\quad", r"T_1 > T_2", fs=40).move_to([RX, 0.4, 0])
        heavy[1][:2].set_color(RED_C)
        heavy[1][3:].set_color(BLUE_C)
        strike = Line(light[1].get_left(), light[1].get_right(), color=RED_C, stroke_width=4)
        with self.say("ten_2"):
            self.play(FadeIn(light))
            self.play(Create(strike))
            self.play(FadeIn(heavy, shift=0.2 * DOWN))

        t1 = force_arrow(PC + PR * LEFT + 0.05 * DOWN, 1.15 * DOWN, RED_C, "T_1", LEFT)
        t2 = force_arrow(PC + PR * RIGHT + 0.05 * DOWN, 0.85 * DOWN, BLUE_C, "T_2", RIGHT)
        diff = eq(r"(T_1 - T_2)", r"\text{ spins the pulley}", fs=40).move_to([RX, -0.8, 0])
        diff[0].set_color(PURPLE_C)
        with self.say("ten_3") as d:
            self.play(GrowArrow(t1[0]), Write(t1[1]))
            self.play(GrowArrow(t2[0]), Write(t2[1]))
            self.wait(max(0.2, d - 5.0))
            self.play(Write(diff))
            self.play(Indicate(torque, color=PURPLE_C))
        self.torque, self.t_arrows = torque, VGroup(t1, t2)
        self.to_panel(need, light, strike, heavy, diff)

    # 7. Newton II for each block
    def newton_masses(self):
        at = self.at
        self.clear_panel()
        head = self.header(r"Newton's 2nd law for each block")
        xa, xb, yb = RX - 2.0, RX + 2.0, 1.25

        box1 = at.m1[:2].copy().clear_updaters().move_to([xa, yb, 0])
        up1 = force_arrow(box1.get_top(), 1.05 * UP, RED_C, "T_1", RIGHT)
        dn1 = force_arrow(box1.get_bottom(), 1.25 * DOWN, INK, "m_1 g", RIGHT)
        ac1 = force_arrow(box1.get_left() + 0.35 * LEFT + 0.35 * UP, 0.75 * DOWN, GREEN_C, "a", LEFT)

        box2 = at.m2[:2].copy().clear_updaters().move_to([xb, yb, 0])
        up2 = force_arrow(box2.get_top(), 1.0 * UP, BLUE_C, "T_2", RIGHT)
        dn2 = force_arrow(box2.get_bottom(), 0.85 * DOWN, INK, "m_2 g", RIGHT)
        ac2 = force_arrow(box2.get_left() + 0.35 * LEFT + 0.35 * DOWN, 0.75 * UP, GREEN_C, "a", LEFT)

        eq1 = eq(r"m_1 g", "-", "T_1", "=", "m_1 a", fs=44).move_to([xa, -1.55, 0])
        eq2 = eq("T_2", "-", r"m_2 g", "=", "m_2 a", fs=44).move_to([xb, -1.55, 0])
        eq1[2].set_color(RED_C)
        eq2[0].set_color(BLUE_C)
        n1 = eq(r"(1)", fs=30, color=SOFT).next_to(eq1, DOWN, buff=0.2)
        n2 = eq(r"(2)", fs=30, color=SOFT).next_to(eq2, DOWN, buff=0.2)

        with self.say("fbd_1"):
            self.head = self.swap_header(head, self.head)
            self.play(FadeOut(self.t_arrows), FadeOut(self.torque), TransformFromCopy(at.m1[:2], box1),
                      run_time=1.2)
        with self.say("fbd_2"):
            self.play(GrowArrow(dn1[0]), Write(dn1[1]))
            self.play(GrowArrow(up1[0]), Write(up1[1]))
            self.play(GrowArrow(ac1[0]), Write(ac1[1]))
        with self.say("fbd_3"):
            self.play(Write(eq1), FadeIn(n1))
        with self.say("fbd_4") as d:
            self.play(TransformFromCopy(at.m2[:2], box2), run_time=1.0)
            self.play(GrowArrow(up2[0]), Write(up2[1]))
            self.play(GrowArrow(dn2[0]), Write(dn2[1]))
            self.wait(max(0.1, d - 5.0))
            self.play(GrowArrow(ac2[0]), Write(ac2[1]))
        with self.say("fbd_5"):
            self.play(Write(eq2), FadeIn(n2))

        self.fbds = VGroup(box1, up1, dn1, ac1, box2, up2, dn2, ac2)
        self.eq1, self.eq2, self.n1, self.n2 = eq1, eq2, n1, n2
        self.to_panel(self.fbds, eq1, eq2, n1, n2)

    # 8. Newton II for the pulley
    def newton_pulley(self):
        at = self.at
        head = self.header(r"\dots and for the pulley")
        # stack (1) and (2) at the top of the panel
        eq1, eq2, n1, n2 = self.eq1, self.eq2, self.n1, self.n2
        tgt1 = eq1.copy().move_to([RX - 0.3, 2.55, 0])
        tgt2 = eq2.copy().next_to(tgt1, DOWN, buff=0.3)
        tgt2.shift((tgt1[3].get_x() - tgt2[3].get_x()) * RIGHT)
        n1_t = n1.copy().next_to(tgt1, RIGHT, buff=0.5)
        n2_t = n2.copy().next_to(tgt2, RIGHT, buff=0.5).align_to(n1_t, LEFT)
        self.play(FadeOut(self.fbds), Transform(eq1, tgt1), Transform(eq2, tgt2),
                  Transform(n1, n1_t), Transform(n2, n2_t), run_time=1.2)
        self.panel.remove(self.fbds)

        t1 = force_arrow(PC + PR * LEFT + 0.05 * DOWN, 1.15 * DOWN, RED_C, "T_1", LEFT)
        t2 = force_arrow(PC + PR * RIGHT + 0.05 * DOWN, 0.85 * DOWN, BLUE_C, "T_2", RIGHT)
        arm1 = Line(PC, PC + PR * LEFT, color=RED_C, stroke_width=4)
        arm2 = Line(PC, PC + PR * RIGHT, color=BLUE_C, stroke_width=4)
        rl1 = eq("r", fs=28, color=RED_C).next_to(arm1, UP, buff=0.05)
        rl2 = eq("r", fs=28, color=BLUE_C).next_to(arm2, UP, buff=0.05)
        with self.say("rot_1") as d:
            self.head = self.swap_header(head, self.head)
            self.play(FadeOut(self.radius), GrowArrow(t1[0]), Write(t1[1]), GrowArrow(t2[0]), Write(t2[1]))
            self.wait(max(0.1, d - 3.4))
            self.play(Create(arm1), Create(arm2), FadeIn(rl1), FadeIn(rl2))

        p1 = eq(r"\tau_{\text{net}}", "=", r"(T_1 - T_2)\,r", "=", r"I\alpha", fs=44).move_to([RX, 0.75, 0])
        p1[4].set_color(PURPLE_C)
        with self.say("rot_2") as d:
            self.play(Write(p1[:3]), run_time=1.5)
            self.wait(max(0.1, d - 3.0))
            self.play(Write(p1[3:]))

        slip = txt(r"no slipping: rim acceleration $= a$", fs=30, color=SOFT).move_to([RX, -0.25, 0])
        p2 = eq(r"\alpha", "=", r"\frac{a}{r}", fs=44).move_to([RX, -1.1, 0])
        rim = Dot(PC + PR * LEFT, radius=0.09, color=GREEN_C)
        with self.say("rot_3") as d:
            self.play(FadeIn(slip), FadeIn(rim, scale=0.5))
            self.play(at.s.animate(rate_func=there_and_back).set_value(0.12), run_time=2.0)
            self.wait(max(0.1, d - 4.2))
            self.play(Write(p2), FadeOut(rim))

        p3 = eq(r"T_1 - T_2", "=", r"\frac{I a}{r^2}", fs=48).move_to([RX - 0.3, -2.5, 0])
        n3 = eq(r"(3)", fs=30, color=SOFT).next_to(p3, RIGHT, buff=0.5)
        with self.say("rot_4"):
            self.play(TransformFromCopy(VGroup(p1, p2), p3), run_time=1.5)
            self.play(FadeIn(n3), Circumscribe(p3, color=PURPLE_C))

        self.pulley_marks = VGroup(t1, t2, arm1, arm2, rl1, rl2)
        self.p3, self.n3 = p3, n3
        self.to_panel(p1, slip, p2, p3, n3)

    # 9. Combine the three equations
    def combine(self):
        eq1, eq2, n1, n2, p3, n3 = self.eq1, self.eq2, self.n1, self.n2, self.p3, self.n3
        head = self.header(r"Put them together")
        with self.say("comb_1"):
            self.head = self.swap_header(head, self.head)
            self.clear_panel(eq1, eq2, n1, n2, p3, n3)
            self.play(p3.animate.next_to(eq2, DOWN, buff=0.3).align_to(eq2, RIGHT),
                      n3.animate.next_to(n2, DOWN, buff=0.52), run_time=1.0)
            plus = eq(r"(1) + (2):", fs=32, color=SOFT).move_to([RX - 1.2, 0.25, 0])
            self.play(FadeIn(plus), Indicate(eq1), Indicate(eq2))

        c1 = eq(r"(m_1 - m_2)\,g", "-", r"(T_1 - T_2)", "=", r"(m_1 + m_2)\,a", fs=44).move_to([RX, -0.35, 0])
        with self.say("comb_2") as d:
            self.play(TransformFromCopy(VGroup(eq1, eq2), c1), run_time=2.0)
            self.play(c1[2].animate.set_color(PURPLE_C))

        c2 = eq(r"(m_1 - m_2)\,g", "-", r"\frac{I}{r^2}\,a", "=", r"(m_1 + m_2)\,a", fs=44).move_to([RX, -1.35, 0])
        c2[2].set_color(PURPLE_C)
        with self.say("comb_3"):
            self.play(Indicate(p3, color=PURPLE_C))
            self.play(TransformFromCopy(c1[0:2], c2[0:2]), TransformFromCopy(p3[2], c2[2]),
                      TransformFromCopy(c1[3:], c2[3:]), run_time=1.6)

        c3 = eq(r"(m_1 - m_2)\,g", "=", r"\Big(m_1 + m_2 +", r"\frac{I}{r^2}", r"\Big)\,a", fs=48)
        c3.move_to([RX, -2.45, 0])
        c3[3].set_color(PURPLE_C)
        box = SurroundingRectangle(c3, color=GOLD_C, buff=0.2, corner_radius=0.1)
        with self.say("comb_4"):
            self.play(TransformMatchingShapes(c2.copy(), c3), run_time=1.8)
            self.play(Create(box))

        # promote the master equation, then read it
        master = VGroup(c3, box)
        self.play(FadeOut(VGroup(eq1, eq2, n1, n2, p3, n3, plus, c1, c2)),
                  FadeOut(self.pulley_marks), FadeIn(self.radius),
                  master.animate.move_to([RX, 2.3, 0]), run_time=1.2)
        self.panel = []
        b1 = Brace(c3[0], DOWN, color=INK)
        b1t = txt(r"driving force", fs=30).next_to(b1, DOWN, buff=0.1)
        b2 = Brace(c3[2:], DOWN, color=INK)
        b2t = txt(r"total inertia $\times$ acceleration", fs=30).next_to(b2, DOWN, buff=0.1)
        with self.say("comb_5") as d:
            self.play(GrowFromCenter(b1), FadeIn(b1t))
            self.wait(max(0.2, d / 2 - 1.2))
            self.play(GrowFromCenter(b2), FadeIn(b2t))

        # "unrolled" picture: one train of masses pushed by the driving force
        track = Line([RX - 3.3, -2.35, 0], [RX + 3.3, -2.35, 0], color=SOFT, stroke_width=2)
        k1 = self.train_car(0.6, RED_C, "m_1")
        k2 = self.train_car(0.55, BLUE_C, "m_2")
        kp = self.train_car(1.6, PURPLE_C, r"I/r^2", fill_opacity=0.85)
        train = VGroup(k1, k2, kp).arrange(RIGHT, buff=0.06, aligned_edge=DOWN)
        train.next_to(track, UP, buff=0).shift(0.6 * LEFT)
        push = force_arrow(train.get_left() + 1.5 * LEFT + 0.3 * UP, 1.35 * RIGHT, INK)
        push_lab = eq(r"(m_1 - m_2)\,g", fs=30).next_to(push, UP, buff=0.1)
        cap = txt(r"the pulley behaves like an \emph{extra mass} $I/r^2$", fs=32,
                  color=PURPLE_C).move_to([RX, -3.3, 0])
        with self.say("comb_6") as d:
            self.play(Create(track), FadeIn(k1, shift=0.2 * UP), FadeIn(k2, shift=0.2 * UP), run_time=1.0)
            self.play(GrowArrow(push[0]), FadeIn(push_lab))
            self.play(FadeIn(kp, shift=0.2 * UP), Indicate(c3[3], color=PURPLE_C, scale_factor=1.3), run_time=1.4)
            self.play(Write(cap))
            self.play(VGroup(train, push, push_lab).animate(rate_func=rate_functions.ease_in_quad).shift(0.6 * RIGHT),
                      run_time=max(1.0, d - 5.2))
        self.master = master
        self.to_panel(master, b1, b1t, b2, b2t, track, train, push, push_lab, cap)

    def train_car(self, w, color, label, fill_opacity=1):
        car = RoundedRectangle(width=w, height=0.6, corner_radius=0.06, stroke_color=INK, stroke_width=2,
                               fill_color=color, fill_opacity=fill_opacity)
        return VGroup(car, eq(label, fs=28, color=WHITE).move_to(car))

    # 10. Solve for I
    def solve(self):
        head = self.header(r"Step 3: \; solve for $I$")
        master = self.master
        self.clear_panel(master)
        self.head = self.swap_header(head, self.head, run_time=0.6)
        self.play(master.animate.scale(0.8).move_to([RX, 2.5, 0]), run_time=0.8)

        s1 = eq(r"I", "=", r"r^2", r"\left[\frac{(m_1 - m_2)\,g}{a} - (m_1 + m_2)\right]", fs=44)
        s1.move_to([RX, 1.3, 0])
        s1[0].set_color(PURPLE_C)
        with self.say("solve_1"):
            self.play(TransformMatchingShapes(master[0].copy(), s1), run_time=2.0)

        rows = VGroup(
            eq(r"(m_1 - m_2)\,g", "=", r"(0.05)(9.8)", "=", r"0.49\,\text{N}"),
            eq(r"\frac{(m_1 - m_2)\,g}{a}", "=", r"\frac{0.49}{0.02}", "=", r"24.5\,\text{kg}"),
            eq(r"\frac{I}{r^2}", "=", r"24.5 - 0.75", "=", r"23.75\,\text{kg}"),
            eq(r"r^2", "=", r"(0.02)^2", "=", r"4\times10^{-4}\,\text{m}^2"),
        )
        for r, y in zip(rows, [0.25, -0.75, -1.85, -2.8]):
            r.move_to([RX, y, 0])
            r.shift((RX - 0.9 - r[1].get_x()) * RIGHT)  # align the = signs
        rows[2][0].set_color(PURPLE_C)
        rows[2][4].set_color(PURPLE_C)

        def reveal(r, d):
            self.play(FadeIn(r[0:2], shift=0.15 * RIGHT), run_time=0.7)
            self.play(FadeIn(r[2:4]), run_time=0.7)
            self.wait(max(0.1, d - 3.0))
            self.play(Write(r[4]), run_time=0.8)

        with self.say("solve_2") as d:
            reveal(rows[0], d)
        with self.say("solve_3") as d:
            reveal(rows[1], d - 1.8)
            self.play(Indicate(rows[1][4], color=GOLD_C))
        with self.say("solve_4") as d:
            reveal(rows[2], d - 1.8)
            self.play(Circumscribe(rows[2][4], color=PURPLE_C))
        with self.say("solve_5") as d:
            reveal(rows[3], d)

        ans = eq(r"I", "=", r"23.75 \times 4\times10^{-4}", r"=\;",r"9.5\times10^{-3}\,\text{kg\,m}^2", fs=40)
        ans.move_to([RX, -3.45, 0])
        ans[0].set_color(PURPLE_C)
        ans[4].set_color(GOLD_C)
        box = SurroundingRectangle(ans[4], color=GOLD_C, buff=0.14, corner_radius=0.08)
        with self.say("solve_6"):
            self.play(TransformFromCopy(VGroup(rows[2][4], rows[3][4]), ans[2]), FadeIn(ans[:2]), run_time=1.3)
            self.play(Write(ans[3:]), run_time=1.0)
            self.play(Create(box))
        self.wait(0.5)
        self.to_panel(s1, rows, ans, box)

    # 11. Cross-check through torque
    def check(self):
        head = self.header(r"Sanity check: \; the torque route")
        with self.say("chk_1"):
            self.head = self.swap_header(head, self.head)
            self.clear_panel()

        lines = VGroup(
            eq(r"T_1", "=", r"m_1(g - a)", "=", r"0.40 \times 9.78", r"\approx 3.912\,\text{N}"),
            eq(r"T_2", "=", r"m_2(g + a)", "=", r"0.35 \times 9.82", r"\approx 3.437\,\text{N}"),
            eq(r"\tau", "=", r"(T_1 - T_2)\,r", "=", r"0.475 \times 0.02", r"= 9.5\times10^{-3}\,\text{N\,m}"),
            eq(r"\alpha", "=", r"a / r", "=", r"0.02 / 0.02", r"= 1\,\text{rad/s}^2"),
        )
        for i, r in enumerate(lines):
            r.scale(0.9).move_to([RX, 2.3 - 1.0 * i, 0])
            r.shift((RX - 3.8 - r[1].get_x()) * RIGHT)
        lines[0][0].set_color(RED_C)
        lines[1][0].set_color(BLUE_C)
        for key, r in zip(["chk_2", "chk_3", "chk_4", "chk_5"], lines):
            with self.say(key) as d:
                self.play(FadeIn(r[0:3], shift=0.15 * RIGHT), run_time=0.8)
                self.wait(max(0.1, d / 2 - 1.4))
                self.play(FadeIn(r[3:5]), run_time=0.6)
                self.play(Write(r[5]), run_time=0.8)

        fin = eq(r"I = \frac{\tau}{\alpha}", r"= 9.5\times10^{-3}\,\text{kg\,m}^2", r"\;\checkmark", fs=48)
        fin.move_to([RX, -2.6, 0])
        fin[1].set_color(GOLD_C)
        fin[2].set_color(GREEN_C)
        with self.say("chk_6"):
            self.play(Write(fin[:2]), run_time=1.4)
            self.play(FadeIn(fin[2], scale=1.6))
        self.to_panel(lines, fin)

    # 12. The options
    def options(self):
        head = self.header(r"Which option?")
        with self.say("opt_1") as d:
            self.head = self.swap_header(head, self.head, run_time=0.6)
            self.clear_panel()
            opts = VGroup(*[
                eq(rf"\text{{({k})}}\quad {v}\,\text{{kg\,m}}^2", fs=46)
                for k, v in [("A", r"4.75\times10^{-3}"), ("B", r"1.86\times10^{-2}"),
                             ("C", r"9.5\times10^{-3}"), ("D", r"8.3\times10^{-3}")]
            ]).arrange(DOWN, aligned_edge=LEFT, buff=0.4).move_to([RX - 0.6, 1.3, 0])
            self.play(LaggedStart(*[FadeIn(o, shift=0.2 * RIGHT) for o in opts], lag_ratio=0.2), run_time=1.4)
            self.wait(max(0.1, d - 3.6))
            good = SurroundingRectangle(opts[2], color=GOLD_C, buff=0.14, corner_radius=0.08)
            tick = eq(r"\checkmark", fs=60, color=GREEN_C).next_to(good, RIGHT, buff=0.3)
            self.play(Create(good), opts[2].animate.set_color(GOLD_C), FadeIn(tick, scale=1.5))
            self.play(opts[0].animate.set_opacity(0.45), opts[1].animate.set_opacity(0.35),
                      opts[3].animate.set_opacity(0.35))

        half = eq(r"= \tfrac{1}{2}\times(\text{C})", fs=38, color=RED_C).next_to(opts[0], RIGHT, buff=0.4)
        with self.say("opt_2"):
            self.play(opts[0].animate.set_opacity(1).set_color(RED_C), Write(half))

        trap = VGroup(
            txt(r"Trap: treat $23.75$ kg as the pulley's mass $M$ and use a disc:", fs=30, color=RED_C),
            eq(r"I = \tfrac{1}{2} M r^2 = \tfrac{1}{2}(23.75)(4\times10^{-4}) = 4.75\times10^{-3}", fs=38,
               color=RED_C),
        ).arrange(DOWN, buff=0.22)
        trap[1].scale_to_fit_width(6.6)
        trap.move_to([RX - 0.3, -1.35, 0])
        cross = eq(r"\boldsymbol{\times}", fs=64, color=RED_C).next_to(trap[1], RIGHT, buff=0.25)
        with self.say("opt_3") as d:
            self.play(FadeIn(trap[0]), run_time=0.8)
            self.wait(max(0.1, d - 3.5))
            self.play(Write(trap[1]), run_time=1.6)

        why = txt(r"The shape is never given --- and never needed:\\ $I/r^2$ comes straight from the equation.",
                  fs=32).move_to([RX, -2.95, 0])
        with self.say("opt_4"):
            self.play(FadeIn(cross, scale=1.5))
            self.play(Write(why), run_time=2.0)
        self.to_panel(opts, good, tick, half, trap, cross, why)

    # 13. Recap
    def recap(self):
        at = self.at
        self.clear_panel()
        self.play(FadeOut(self.head), FadeOut(self.a_chip), FadeOut(self.radius), FadeOut(at), run_time=1.0)
        at.wheel.clear_updaters()
        title = txt(r"\textbf{The recipe}", fs=54).to_edge(UP, buff=0.5)
        steps = VGroup(
            VGroup(txt(r"\textbf{1.}\; Kinematics gives the acceleration", fs=38),
                   eq(r"a = \frac{2s}{t^2}", fs=40, color=GREEN_C)),
            VGroup(txt(r"\textbf{2.}\; Newton's law on every body --- keep $T_1 \neq T_2$", fs=38),
                   eq(r"m_1 g - T_1 = m_1 a,\quad T_2 - m_2 g = m_2 a,\quad (T_1 - T_2)\,r = I\,\frac{a}{r}",
                      fs=36)),
            VGroup(txt(r"\textbf{3.}\; The pulley acts like an extra mass $I/r^2$", fs=38),
                   eq(r"(m_1 - m_2)\,g = \Big(m_1 + m_2 + \frac{I}{r^2}\Big)\,a", fs=40, color=PURPLE_C)),
        )
        for s in steps:
            s.arrange(DOWN, buff=0.22, aligned_edge=LEFT)
            s[1].shift(0.6 * RIGHT)
        steps.arrange(DOWN, buff=0.45, aligned_edge=LEFT).next_to(title, DOWN, buff=0.5)

        with self.say("sum_1"):
            self.play(Write(title))
        for key, s in zip(["sum_2", "sum_3", "sum_4"], steps):
            with self.say(key):
                self.play(FadeIn(s[0], shift=0.2 * RIGHT), run_time=0.8)
                self.play(Write(s[1]), run_time=1.2)

        final = eq(r"\text{Answer: (C)}\qquad I = 9.5\times10^{-3}\,\text{kg\,m}^2", fs=52, color=GOLD_C)
        final.to_edge(DOWN, buff=0.55)
        fbox = SurroundingRectangle(final, color=GOLD_C, buff=0.2, corner_radius=0.1)
        self.play(Write(final), Create(fbox), run_time=1.6)
        self.wait(3)
        self.play(FadeOut(Group(*self.mobjects)), run_time=1.5)
        self.wait(0.5)
