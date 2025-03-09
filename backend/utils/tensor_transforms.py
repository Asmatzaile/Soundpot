import numpy as np
import torch

def lerp(tensor1, tensor2, t):
    return (1 - t) * tensor1 + t * tensor2


def scale(tensor, factor):
    return tensor * factor


def rotate(vec, factor):
    angle = factor * np.pi
    cos, sin = np.cos(angle), np.sin(angle)
    rotation_matrix = torch.tensor(
        [[cos, -sin], [sin, cos]], device=vec.device, dtype=torch.float32
    )
    orig_shape = vec.shape
    vec_2d = vec.reshape(-1, 2)
    rotated = torch.matmul(vec_2d, rotation_matrix)
    return rotated.reshape(orig_shape)


def nonlinear(vec, factor):
    return torch.tanh(vec * (1 + factor))

def clip_lengths_to_min(tensor1, tensor2):
    min_length = min(tensor1.shape[1], tensor2.shape[1])
    tensor1 = tensor1[:, :min_length]
    tensor2 = tensor2[:, :min_length]
    return [tensor1, tensor2]
