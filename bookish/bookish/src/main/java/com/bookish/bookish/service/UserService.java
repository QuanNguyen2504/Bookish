package com.bookish.bookish.service;

import com.bookish.bookish.dto.request.ChangePasswordRequest;
import com.bookish.bookish.dto.request.CreateStaffRequest;
import com.bookish.bookish.dto.response.CustomerResponse;
import com.bookish.bookish.entity.Cart;
import com.bookish.bookish.entity.Role;
import com.bookish.bookish.entity.User;
import com.bookish.bookish.exception.AppException;
import com.bookish.bookish.exception.ErrorCode;
import com.bookish.bookish.mapper.UserMapper;
import com.bookish.bookish.repository.CartItemRepository;
import com.bookish.bookish.repository.CartRepository;
import com.bookish.bookish.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       CartRepository cartRepository,
                       CartItemRepository cartItemRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
    }

    public CustomerResponse createCustomers(User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new AppException(ErrorCode.USERNAME_EXISTED);
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(Role.USER);
        return UserMapper.toCustomerResponse(userRepository.save(user));
    }

    public List<CustomerResponse> getAllCustomers() {
        return userRepository.findByRole(Role.USER)
                .stream()
                .map(UserMapper::toCustomerResponse)
                .toList();
    }

    public CustomerResponse updateCustomer(Integer id, User newUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setUsername(newUser.getUsername());
        user.setEmail(newUser.getEmail());
        user.setPhone(newUser.getPhone());
        user.setAddress(newUser.getAddress());
        return UserMapper.toCustomerResponse(userRepository.save(user));
    }

    //  Xóa cart_items → cart → user
    @Transactional
    public void deleteCustomer(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Optional<Cart> cart = cartRepository.findByUser(user);
        cart.ifPresent(c -> {
            cartItemRepository.deleteByCart(c); // xóa cart items trước
            cartRepository.delete(c);           // xóa cart
        });

        userRepository.delete(user);
    }

    public List<CustomerResponse> getAllStaff() {
        return userRepository.findAll()
                .stream()
                .filter(u -> u.getRole() == Role.STAFF || u.getRole() == Role.ADMIN)
                .map(UserMapper::toCustomerResponse)
                .toList();
    }

    public CustomerResponse createStaff(CreateStaffRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new AppException(ErrorCode.USERNAME_EXISTED);
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.STAFF);
        return UserMapper.toCustomerResponse(userRepository.save(user));
    }

    public void changePassword(Integer userId, ChangePasswordRequest req) {
        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.PASSWORD_INCORRECT);
        }
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }
}